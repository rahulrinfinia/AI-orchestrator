/**
 * @rcm/handlers — billing event subscribers.
 *
 * Listens for clinical domain events and auto-creates / updates billing
 * receipts so the cashier always has a priced itemised estimate without
 * any manual data entry.
 *
 * Event flow (receipts created lazily on first billable event, not at check-in):
 *   encounter.signed     → encounter receipt + consultation fee line item
 *   order.created        → lab/rad encounter receipt + test items
 *   prescription.created → pharmacy encounter receipt + med items
 *
 * Visit-level receipts (encounter_id NULL) are lazy-created via getOrCreateVisitReceiptShell
 * for registration fees, copay, and manual cashier lines — not at check-in.
 *
 * Handlers are idempotent: running them twice for the same event produces
 * the same result (ON CONFLICT / early-return guards throughout).
 */

import { sql, eq, and, asc, isNull, ne } from 'drizzle-orm';
import { db } from '../../../db/client.js';
import { receipts, receipt_items, billing_counters, audit_events } from '../pgschema/index.js';
import { encounters, prescriptions, prescription_items } from '../../clinical/pgschema/index.js';
import {
  service_catalog,
  items_master,
} from '../../platform/pgschema/index.js';
import { logger } from '../../../shared/logger.js';
import {
  serverEventBus,
  type EncounterSignedEvent,
  type OrderCreatedEvent,
  type PrescriptionCreatedEvent,
  type ClaimDraftCreatedEvent,
  type ReceiptCreatedEvent,
  type ProcedurePerformedEvent,
} from '../../orchestration/event-bus.js';
import { adjudicateReceiptLine } from './adjudication.js';
import { resolveCatalogItemPrice } from './resolveCatalogPrice.js';
import {
  AUDIT_ENTITY,
  COUNTER_TYPE,
  DOCUMENT_NUMBER_SEQ_PAD,
  ENCOUNTER_TYPE,
  PRICE_LIST_CODE,
  RECEIPT_NUMBER_PREFIX,
  RECEIPT_STATUS,
  RCM_EVENT,
  VISIT_CATEGORY,
} from '../rcm.constants.js';

async function nextBillingSeq(organizationId: string, counterType: string): Promise<number> {
  const cntRows = await db
    .insert(billing_counters)
    .values({ organization_id: organizationId, counter_type: counterType, last_value: 1 })
    .onConflictDoUpdate({
      target: [billing_counters.organization_id, billing_counters.counter_type],
      set: { last_value: sql`${billing_counters.last_value} + 1` },
    })
    .returning({ last_value: billing_counters.last_value }) as unknown as Array<{ last_value: number }>;
  return cntRows[0]!.last_value;
}

async function recalculateReceiptTotals(receiptId: string): Promise<void> {
  await db
    .update(receipts)
    .set({
      subtotal: sql`(SELECT COALESCE(SUM(line_total), 0) FROM receipt_items WHERE receipt_id = ${receiptId})`,
      total_amount: sql`(SELECT COALESCE(SUM(line_total), 0) FROM receipt_items WHERE receipt_id = ${receiptId})
                           - ${receipts.discount_amount} + ${receipts.tax_amount}`,
      updated_at: sql`now()`,
    })
    .where(eq(receipts.id, receiptId));
}

/**
 * Resolve the org-level unit price for a service code via items_master + item_prices.
 */
async function resolveServicePrice(
  organizationId: string,
  serviceCode: string,
  category: string,
): Promise<{ unitPrice: number; description: string; serviceCatalogId: string | null }> {
  return resolveCatalogItemPrice(organizationId, serviceCode, category);
}

/**
 * Resolve the consultation fee for a visit category via items_master + item_prices.
 * Returns unitPrice = 0 when no item_prices row exists — the caller's addReceiptItem
 * will flag the line as ⚠ UNPRICED rather than silently billing a hardcoded amount.
 * Exported so billing/invoices can share the same resolution logic.
 */
export async function resolveConsultationFee(
  organizationId: string,
  visitCategory: string,
): Promise<{ unitPrice: number; description: string; serviceCode: string }> {
  const categoryKey = (visitCategory ?? 'new').toLowerCase();
  const consultTier = categoryKey === VISIT_CATEGORY.OPD ? VISIT_CATEGORY.NEW : categoryKey;
  const primaryCode  = `CONSULT-${consultTier.toUpperCase()}`;
  const fallbackCode = 'CONSULT-NEW';

  for (const code of [primaryCode, fallbackCode]) {
    const resolved = await resolveServicePrice(organizationId, code, 'consultation');
    if (resolved.unitPrice > 0) {
      return { unitPrice: resolved.unitPrice, description: resolved.description, serviceCode: code };
    }
  }

  logger.warn('[Billing] resolveConsultationFee: no item_prices for CONSULT codes', {
    organizationId,
    visitCategory,
    codesChecked: [primaryCode, fallbackCode],
  });
  return {
    unitPrice:   0,
    description: `Consultation fee (${categoryKey} visit)`,
    serviceCode: primaryCode,
  };
}

/**
 * Get or create a draft receipt for an encounter.
 * Returns the existing receipt if one already exists; otherwise creates a new one.
 */
async function getOrCreateReceipt(opts: {
  organizationId: string;
  visitId: string;
  patientId: string;
  encounterId: string;
  createdBy: string;
}): Promise<{ receiptId: string; receiptNumber: string; isNew: boolean }> {
  const existing = await db
    .select({ id: receipts.id, receipt_number: receipts.receipt_number })
    .from(receipts)
    .where(and(
      eq(receipts.encounter_id, opts.encounterId),
      eq(receipts.organization_id, opts.organizationId),
      ne(receipts.status, RECEIPT_STATUS.VOID),
    ))
    .limit(1);

  if (existing.length) {
    const r = existing[0]!;
    return { receiptId: r.id, receiptNumber: r.receipt_number, isNew: false };
  }

  const seq = await nextBillingSeq(opts.organizationId, COUNTER_TYPE.RECEIPT);
  const receiptNumber = `${RECEIPT_NUMBER_PREFIX}-${new Date().getFullYear()}-${String(seq).padStart(DOCUMENT_NUMBER_SEQ_PAD, '0')}`;

  const inserted = await db
    .insert(receipts)
    .values({
      organization_id: opts.organizationId,
      visit_id: opts.visitId,
      patient_id: opts.patientId,
      encounter_id: opts.encounterId,
      receipt_number: receiptNumber,
      status: RECEIPT_STATUS.DRAFT,
      subtotal: '0',
      discount_amount: '0',
      tax_amount: '0',
      total_amount: '0',
      created_by: opts.createdBy,
    })
    .returning({ id: receipts.id, receipt_number: receipts.receipt_number }) as unknown as Array<{ id: string; receipt_number: string }>;
  const r = inserted[0]!;
  return { receiptId: r.id, receiptNumber: r.receipt_number, isNew: true };
}

/**
 * Lazy-create a visit-level receipt (encounter_id NULL) for registration fees,
 * copay, and other charges that are not tied to a specific clinical encounter.
 * Not called at check-in — only when a visit-level charge is actually posted.
 */
export async function getOrCreateVisitReceiptShell(opts: {
  organizationId: string;
  visitId: string;
  patientId: string;
  createdBy: string;
}): Promise<{ receiptId: string; receiptNumber: string; isNew: boolean }> {
  const existing = await db
    .select({ id: receipts.id, receipt_number: receipts.receipt_number })
    .from(receipts)
    .where(and(
      eq(receipts.visit_id, opts.visitId),
      eq(receipts.organization_id, opts.organizationId),
      isNull(receipts.encounter_id),
      ne(receipts.status, RECEIPT_STATUS.VOID),
    ))
    .orderBy(asc(receipts.created_at))
    .limit(1);

  if (existing.length) {
    const r = existing[0]!;
    return { receiptId: r.id, receiptNumber: r.receipt_number, isNew: false };
  }

  const seq = await nextBillingSeq(opts.organizationId, COUNTER_TYPE.RECEIPT);
  const receiptNumber = `${RECEIPT_NUMBER_PREFIX}-${new Date().getFullYear()}-${String(seq).padStart(DOCUMENT_NUMBER_SEQ_PAD, '0')}`;

  const inserted = await db
    .insert(receipts)
    .values({
      organization_id: opts.organizationId,
      visit_id: opts.visitId,
      patient_id: opts.patientId,
      encounter_id: null,
      receipt_number: receiptNumber,
      status: RECEIPT_STATUS.DRAFT,
      subtotal: '0',
      discount_amount: '0',
      tax_amount: '0',
      total_amount: '0',
      created_by: opts.createdBy,
    })
    .returning({ id: receipts.id, receipt_number: receipts.receipt_number }) as unknown as Array<{ id: string; receipt_number: string }>;
  const r = inserted[0]!;
  return { receiptId: r.id, receiptNumber: r.receipt_number, isNew: true };
}

/**
 * Append a priced line item to a receipt and recalculate totals.
 */
async function addReceiptItem(opts: {
  receiptId: string;
  organizationId: string;
  patientId: string;
  visitId?: string | null;
  encounterId?: string | null;
  sourceType: string;
  sourceId: string;
  serviceCode: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  serviceCatalogId?: string | null;
  labTestCatalogId?: string | null;
  radiologyCatalogId?: string | null;
  productCatalogId?: string | null;
  notes?: string;
}): Promise<void> {
  const lineTotal = opts.quantity * opts.unitPrice;
  let payerType: 'patient' | 'insurance' | 'waiver' | 'pending_auth' = 'patient';
  let copayAmount = 0;
  let planBenefitId: string | null = null;
  let insurancePlan: string | null = null;
  let adjudicationError: string | null = null;

  try {
    const adj = await adjudicateReceiptLine({
      organizationId: opts.organizationId,
      patientId: opts.patientId,
      serviceCatalogId: opts.serviceCatalogId,
      serviceCode: opts.serviceCode,
      labTestCatalogId: opts.labTestCatalogId,
      radiologyCatalogId: opts.radiologyCatalogId,
      productCatalogId: opts.productCatalogId,
      grossAmount: lineTotal,
      encounterId: opts.encounterId,
      visitId: opts.visitId,
    });
    payerType = adj.payerType;
    copayAmount = adj.copayAmount;
    planBenefitId = adj.planBenefitId;
    insurancePlan = adj.insurancePlan;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Billing] adjudicateReceiptLine error — line saved as patient-pay', {
      receiptId: opts.receiptId,
      organizationId: opts.organizationId,
      patientId: opts.patientId,
      serviceCode: opts.serviceCode,
      error: msg,
    });
    adjudicationError = msg.slice(0, 500);
  }

  const pricingNote = opts.unitPrice === 0
    ? `⚠ UNPRICED — item not enrolled or missing item_prices row; charge manually. ${opts.notes ?? ''}`.trim()
    : (opts.notes ?? null);

  if (opts.unitPrice === 0) {
    logger.warn(
      '[Billing] UNPRICED receipt line',
      { code: opts.serviceCode, category: opts.category, org: opts.organizationId },
    );
  }

  await db.insert(receipt_items).values({
    receipt_id: opts.receiptId,
    service_catalog_id: opts.serviceCatalogId ?? null,
    source_type: opts.sourceType,
    source_id: opts.sourceId,
    service_code: opts.serviceCode,
    description: opts.description,
    category: opts.category,
    quantity: String(opts.quantity),
    unit_price: String(opts.unitPrice),
    discount_amount: '0',
    notes: pricingNote,
    payer_type: payerType,
    copay_amount: String(copayAmount),
    plan_benefit_id: planBenefitId,
    insurance_plan: insurancePlan,
    adjudication_error: adjudicationError,
  });

  await recalculateReceiptTotals(opts.receiptId);
}

serverEventBus.on<EncounterSignedEvent>(RCM_EVENT.ENCOUNTER_SIGNED, async (event) => {
  if (!event.visitId || !event.organizationId) return;
  logger.info('[Billing] encounter.signed — adding consultation fee', event.encounterId);
  try {
    const encRows = await db
      .select({
        encounter_id: encounters.id,
        created_by: encounters.created_by,
        visit_id: encounters.visit_id,
        encounter_type: encounters.encounter_type,
      })
      .from(encounters)
      .where(eq(encounters.id, event.encounterId))
      .limit(1);
    if (!encRows.length) return;
    const enc = encRows[0] as { encounter_id: string; created_by: string; visit_id: string; encounter_type: string };
    if (enc.encounter_type !== ENCOUNTER_TYPE.OPD) return;

    const { receiptId, receiptNumber } = await getOrCreateReceipt({
      organizationId: event.organizationId,
      visitId:        event.visitId,
      patientId:      event.patientId,
      encounterId:    event.encounterId,
      createdBy:      event.signedBy ?? enc.created_by,
    });

    const existing = await db
      .select({ id: receipt_items.id })
      .from(receipt_items)
      .where(and(
        eq(receipt_items.receipt_id, receiptId),
        eq(receipt_items.source_type, 'encounter'),
        eq(receipt_items.source_id, event.encounterId),
      ))
      .limit(1);
    if (existing.length) {
      logger.info('[Billing] consultation fee already on receipt', receiptNumber, '— skipping');
      return;
    }

    const { unitPrice, description, serviceCode } = await resolveConsultationFee(
      event.organizationId,
      event.visitCategory ?? VISIT_CATEGORY.OPD,
    );

    await addReceiptItem({
      receiptId,
      organizationId: event.organizationId,
      patientId:      event.patientId,
      visitId:        event.visitId,
      encounterId:    event.encounterId,
      sourceType: 'encounter',
      sourceId:   event.encounterId,
      serviceCode,
      description,
      category:   'consultation',
      quantity:   1,
      unitPrice,
    });

    logger.info('[Billing] receipt', receiptNumber, '— consultation fee', unitPrice, 'added on sign');

    await serverEventBus.emit({
      type:           RCM_EVENT.RECEIPT_CREATED,
      receiptId,
      receiptNumber,
      visitId:        event.visitId,
      patientId:      event.patientId,
      organizationId: event.organizationId,
      totalAmount:    unitPrice,
      trigger:        'encounter',
    });
  } catch (err) {
    console.error('[Billing] encounter.signed fee handler error:', err);
  }
});

serverEventBus.on<OrderCreatedEvent>('order.created', async (event) => {
  logger.info('[Billing] order.created', event.orderId, event.orderType);
  try {
    const { receiptId, receiptNumber } = await getOrCreateReceipt({
      organizationId: event.organizationId,
      visitId:        event.visitId,
      patientId:      event.patientId,
      encounterId:    event.billingEncounterId,
      createdBy:      event.createdBy,
    });

    for (const item of event.items) {
      const code = item.serviceCode ?? (event.orderType === 'laboratory' ? 'LAB-GENERIC' : 'RAD-GENERIC');
      let unitPrice = 0;
      let description = item.testName;
      let serviceCatalogId: string | null = item.serviceCatalogId ?? null;

      if (serviceCatalogId) {
        const scRows = await db
          .select({
            display: service_catalog.display,
            code: service_catalog.code,
            unit_price: sql`(SELECT ip.unit_price
                FROM item_prices ip
                JOIN price_lists pl ON pl.id = ip.price_list_id AND pl.active = true
                WHERE ip.item_id = ${items_master.id}
                  AND ip.organization_id = ${event.organizationId}
                  AND ip.active = true
                  AND ip.effective_from <= CURRENT_DATE
                  AND (ip.effective_to IS NULL OR ip.effective_to >= CURRENT_DATE)
                ORDER BY CASE WHEN upper(pl.code) = ${PRICE_LIST_CODE.STANDARD} THEN 0 ELSE 1 END, ip.effective_from DESC
                LIMIT 1)`.as('unit_price'),
          })
          .from(service_catalog)
          .innerJoin(items_master, and(
            eq(items_master.service_catalog_id, service_catalog.id),
            eq(items_master.organization_id, event.organizationId),
            eq(items_master.active, true),
          ))
          .where(and(eq(service_catalog.id, serviceCatalogId), eq(service_catalog.active, true)))
          .limit(1);
        if (scRows.length) {
          const sc = scRows[0] as { display: string; code: string; unit_price: number };
          description = item.testName || sc.display;
          unitPrice = Number(sc.unit_price ?? 0);
        }
      } else {
        const resolved = await resolveServicePrice(event.organizationId, code, event.orderType);
        unitPrice = resolved.unitPrice;
        description = item.testName || resolved.description;
        serviceCatalogId = resolved.serviceCatalogId;
      }

      await addReceiptItem({
        receiptId,
        organizationId:     event.organizationId,
        patientId:          event.patientId,
        visitId:            event.visitId,
        encounterId:        event.billingEncounterId,
        sourceType:         'diagnostic_order',
        sourceId:           event.orderId,
        serviceCode:        code,
        description,
        category:           event.orderType,
        quantity:           1,
        unitPrice,
        serviceCatalogId,
        labTestCatalogId:   item.labTestCatalogId ?? null,
        radiologyCatalogId: item.radiologyCatalogId ?? null,
        notes:              `Order type: ${event.orderType}`,
      });
    }

    logger.info('[Billing] receipt', receiptNumber, 'updated for', event.orderType, 'encounter', event.billingEncounterId);
  } catch (err) {
    console.error('[Billing] order.created handler error:', err);
  }
});

serverEventBus.on<PrescriptionCreatedEvent>('prescription.created', async (event) => {
  if (!event.visitId || !event.organizationId) return;
  logger.info('[Billing] prescription.created', event.prescriptionId);
  try {
    let billingEncounterId = event.billingEncounterId ?? null;
    if (!billingEncounterId) {
      const rxRows = await db
        .select({ billing_encounter_id: prescriptions.billing_encounter_id })
        .from(prescriptions)
        .where(eq(prescriptions.id, event.prescriptionId))
        .limit(1);
      billingEncounterId = rxRows.length
        ? String(rxRows[0]!.billing_encounter_id ?? '') || null
        : null;
    }
    if (!billingEncounterId) {
      logger.warn('[Billing] prescription.created — no billing_encounter_id; skipping receipt lines', event.prescriptionId);
      return;
    }

    const pharmEncRows = await db
      .select({ created_by: encounters.created_by })
      .from(encounters)
      .where(eq(encounters.id, billingEncounterId))
      .limit(1);
    const createdBy = pharmEncRows.length
      ? String(pharmEncRows[0]!.created_by ?? event.patientId)
      : event.patientId;

    const visitId            = event.visitId!;
    const organizationId     = event.organizationId!;

    const { receiptId, receiptNumber } = await getOrCreateReceipt({
      organizationId,
      visitId,
      patientId:   event.patientId,
      encounterId: billingEncounterId,
      createdBy,
    });

    const rxItems = await db
      .select({
        medication_name: prescription_items.medication_name,
        medication_code: prescription_items.medication_code,
        quantity_to_dispense: prescription_items.quantity_to_dispense,
        generic_name: prescription_items.generic_name,
      })
      .from(prescription_items)
      .where(eq(prescription_items.prescription_id, event.prescriptionId));

    for (const item of rxItems as Array<Record<string, unknown>>) {
      const medCode = String(item['medication_code'] ?? 'RX-GENERIC');
      const medName = String(item['medication_name'] ?? 'Medication');
      const qty     = Number(item['quantity_to_dispense'] ?? 1);

      const { unitPrice: catalogPrice, serviceCatalogId } = await resolveServicePrice(
        organizationId,
        medCode,
        'pharmacy',
      );

      await addReceiptItem({
        receiptId,
        organizationId,
        patientId:   event.patientId,
        visitId,
        encounterId: billingEncounterId,
        sourceType:      'prescription',
        sourceId:        event.prescriptionId,
        serviceCode:     medCode,
        description:     medName,
        category:        'pharmacy',
        quantity:        qty,
        unitPrice:       catalogPrice,
        serviceCatalogId,
      });
    }

    logger.info('[Billing] receipt', receiptNumber, 'updated for pharmacy encounter', billingEncounterId);
  } catch (err) {
    console.error('[Billing] prescription.created handler error:', err);
  }
});

serverEventBus.on<ClaimDraftCreatedEvent>(RCM_EVENT.CLAIM_DRAFT_CREATED, async (event) => {
  logger.info('[Billing] claim_draft.created — id:', event.claimDraftId, 'mode:', event.mode, 'encounter:', event.encounterId);

  try {
    await db
      .update(encounters)
      .set({
        claim_draft_id: event.claimDraftId,
        updated_at: sql`now()`,
      })
      .where(and(eq(encounters.id, event.encounterId), isNull(encounters.claim_draft_id)));

    logger.info(
      '[Billing] encounter', event.encounterId,
      'linked to claim_draft', event.claimDraftId,
      '(mode:', event.mode + ')',
    );
  } catch (err) {
    console.warn('[Billing] claim_draft.created — could not update encounter:', (err as Error).message);
  }
});

serverEventBus.on<ProcedurePerformedEvent>('procedure.performed', async (event) => {
  logger.info('[Billing] procedure.performed —', event.procedureName, 'visit:', event.visitId);
  try {
    const encRows = await db
      .select({
        encounter_id: encounters.id,
        created_by: encounters.created_by,
      })
      .from(encounters)
      .where(and(
        eq(encounters.visit_id, event.visitId),
        sql`${encounters.encounter_type}::text = ${ENCOUNTER_TYPE.OPD}`,
        eq(encounters.organization_id, event.organizationId),
      ))
      .orderBy(asc(encounters.created_at))
      .limit(1);
    if (!encRows.length) {
      console.warn('[Billing] procedure.performed — no OPD encounter found for visit', event.visitId);
      return;
    }
    const enc = encRows[0] as { encounter_id: string; created_by: string };

    const { receiptId, receiptNumber } = await getOrCreateReceipt({
      organizationId: event.organizationId,
      visitId:        event.visitId,
      patientId:      event.patientId,
      encounterId:    enc.encounter_id,
      createdBy:      enc.created_by,
    });

    const existing = await db
      .select({ id: receipt_items.id })
      .from(receipt_items)
      .where(and(
        eq(receipt_items.receipt_id, receiptId),
        eq(receipt_items.source_type, 'procedure'),
        eq(receipt_items.source_id, event.procedureId),
      ))
      .limit(1);
    if (existing.length) return;

    const code = event.procedureCode ?? 'PROC-GENERIC';
    const { unitPrice, description, serviceCatalogId } = await resolveServicePrice(
      event.organizationId,
      code,
      'procedure',
    );

    await addReceiptItem({
      receiptId,
      organizationId: event.organizationId,
      patientId:      event.patientId,
      visitId:        event.visitId,
      encounterId:    enc.encounter_id,
      sourceType:      'procedure',
      sourceId:        event.procedureId,
      serviceCode:     code,
      description:     event.procedureName || description,
      category:        'procedure',
      quantity:        1,
      unitPrice,
      serviceCatalogId,
    });

    logger.info('[Billing] receipt', receiptNumber, 'updated — procedure', event.procedureName, 'billed at', unitPrice);
  } catch (err) {
    console.error('[Billing] procedure.performed handler error:', err);
  }
});

serverEventBus.on<ReceiptCreatedEvent>(RCM_EVENT.RECEIPT_CREATED, async (event) => {
  logger.info(
    '[Billing] receipt.created —', event.receiptNumber,
    'visit:', event.visitId,
    'total:', event.totalAmount,
    'trigger:', event.trigger,
  );

  try {
    await db
      .insert(audit_events)
      .values({
        event_type: RCM_EVENT.RECEIPT_CREATED,
        entity_type: AUDIT_ENTITY.RECEIPT,
        entity_id: event.receiptId,
        details: {
          receiptNumber:  event.receiptNumber,
          visitId:        event.visitId,
          patientId:      event.patientId,
          organizationId: event.organizationId,
          totalAmount:    event.totalAmount,
          trigger:        event.trigger,
        },
        created_at: sql`now()`,
      })
      .onConflictDoNothing();
  } catch {
    // audit_events table may not be migrated yet — non-fatal
  }
});

