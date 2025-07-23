import { Outlet } from 'react-router';

export const OtherPagesLayout = () => {
  return (
    <div className="w-full overflow-y-auto flex flex-col max-w-6xl p-6">
      <Outlet />
    </div>
  );
};
