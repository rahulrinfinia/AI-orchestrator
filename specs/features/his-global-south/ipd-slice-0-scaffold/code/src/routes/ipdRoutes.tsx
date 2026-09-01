import { Route, Routes } from 'react-router-dom';
import { IpdV1Routes } from '@/pages/ipd/v1/routes';

/** IPD entry — version boundary; delegates to v1 router today. */
export function IpdRoutes() {
  return (
    <Routes>
      <Route path="/*" element={<IpdV1Routes />} />
    </Routes>
  );
}
