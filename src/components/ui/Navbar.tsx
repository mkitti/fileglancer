import * as React from 'react';
import {
  IconButton,
  Typography,
  Collapse,
  Navbar,
  List,
  Menu
} from '@material-tailwind/react';
import { Link } from 'react-router-dom';
import {
  Folder,
  HelpCircle,
  LogOut as LogoutIcon,
  Menu as MenuIcon,
  ProfileCircle,
  Settings,
  Suitcase,
  UserCircle,
  Xmark
} from 'iconoir-react';

const LINKS = [
  {
    icon: Folder,
    title: 'Files',
    href: '/files'
  },
  {
    icon: Suitcase,
    title: 'Jobs',
    href: '/jobs'
  },
  {
    icon: HelpCircle,
    title: 'Help',
    href: '/help'
  }
];

// Links list component
function NavList() {
  return (
    <>
      {LINKS.map(({ icon: Icon, title, href }) => (
        <List.Item
          key={title}
          as={Link}
          to={href}
          className="flex items-center"
        >
          <List.ItemStart className="mr-1.5">
            <Icon className="h-4 w-4" />
          </List.ItemStart>
          <Typography type="small">{title}</Typography>
        </List.Item>
      ))}
    </>
  );
}

// Profile dropdown menu component
function ProfileMenu() {
  return (
    <Menu>
      <Menu.Trigger className="flex items-center justify-center p-1 rounded-full h-8 w-8">
        <ProfileCircle className="h-6 w-6" />
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item as={Link} to="/profile">
          <UserCircle className="mr-2 h-[18px] w-[18px]" /> Profile
        </Menu.Item>
        <Menu.Item as={Link} to="/preferences">
          <Settings className="mr-2 h-[18px] w-[18px]" /> Preferences
        </Menu.Item>
        <hr className="!my-1 -mx-1 border-surface" />
        <Menu.Item
          as={Link}
          to="/login"
          className="text-error hover:bg-error/10 hover:text-error focus:bg-error/10 focus:text-error"
        >
          <LogoutIcon className="mr-2 h-[18px] w-[18px]" />
          Logout
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

// Composed navbar
export default function FileglancerNavbar() {
  const [openNav, setOpenNav] = React.useState(false);

  React.useEffect(() => {
    window.addEventListener(
      'resize',
      () => window.innerWidth >= 960 && setOpenNav(false)
    );
  }, []);

  return (
    <Navbar className="mx-auto w-full rounded-t-none">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Typography
          as={Link}
          to="/lab/"
          type="small"
          className="ml-2 mr-2 block py-1 font-semibold"
        >
          Janelia Fileglancer
        </Typography>
        {/* Desktop menu links */}
        <div className="hidden lg:block">
          <List className="mt-4 flex flex-col gap-1 lg:mt-0 lg:flex-row lg:items-center">
            <NavList />
          </List>
        </div>
        {/* Mobile menu links button */}
        <IconButton
          size="sm"
          variant="ghost"
          color="secondary"
          onClick={() => setOpenNav(!openNav)}
          className="mr-2 grid ml-auto lg:hidden"
        >
          {openNav ? (
            <Xmark className="h-4 w-4" />
          ) : (
            <MenuIcon className="h-4 w-4" />
          )}
        </IconButton>
        {/* Profile dropdown menu */}
        <ProfileMenu />
      </div>
      <Collapse open={openNav}>
        <NavList />
      </Collapse>
    </Navbar>
  );
}
