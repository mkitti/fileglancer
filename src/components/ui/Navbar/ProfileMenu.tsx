import { useEffect, useState } from 'react';
import useProfile from '@/hooks/useProfile'; // Assuming you have a custom hook for fetching profile
import { IconButton, Menu } from '@material-tailwind/react';
import { HiOutlineLogout, HiOutlineUserCircle } from 'react-icons/hi';
import { HiOutlineAdjustmentsHorizontal } from 'react-icons/hi2';
import { Link } from 'react-router-dom';

export default function ProfileMenu() {
  const [origin, setOrigin] = useState('');
  const { profile } = useProfile();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <Menu>
      <Menu.Trigger
        as={IconButton}
        size="sm"
        variant="ghost"
        color="secondary"
        className="text-foreground hover:!text-foreground focus:!text-foreground hover:bg-hover-gradient hover:dark:bg-hover-gradient-dark focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark"
      >
        <HiOutlineUserCircle className="stroke-2 icon-large short:icon-default" />
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item
          as={Link}
          to="/profile"
          className="text-foreground hover:!text-foreground focus:!text-foreground hover:bg-hover-gradient hover:dark:bg-hover-gradient-dark focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark"
        >
          <HiOutlineUserCircle className="mr-2 icon-default" />
          {profile ? profile.username : 'Loading...'}
        </Menu.Item>
        <Menu.Item
          as={Link}
          to="/preferences"
          className="text-foreground hover:!text-foreground focus:!text-foreground hover:bg-hover-gradient hover:dark:bg-hover-gradient-dark focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark"
        >
          <HiOutlineAdjustmentsHorizontal className="mr-2 icon-default" />
          Preferences
        </Menu.Item>
        <hr className="!my-1 -mx-1 border-surface" />
        <Menu.Item
          as={Link}
          to={`${origin}/logout`}
          className="text-error hover:bg-error/10 hover:!text-error focus:bg-error/10 focus:!text-error"
        >
          <HiOutlineLogout className="mr-2 h-[18px] w-[18px]" /> Logout
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}
