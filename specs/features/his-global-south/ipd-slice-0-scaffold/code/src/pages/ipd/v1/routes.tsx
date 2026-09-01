import { Route, Routes } from 'react-router-dom';
import IpdDashboardPage from './index';

/** v1 sub-router — owns all paths under /ipd/v1/* */
export function IpdV1Routes() {
  return (
    <Routes>
      <Route index element={<IpdDashboardPage />} />
    </Routes>
  );
}
