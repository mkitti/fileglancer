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
  HalfMoon,
  HelpCircle,
  LogOut as LogoutIcon,
  Menu as MenuIcon,
  ProfileCircle,
  Settings,
  Suitcase,
  SunLight,
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
          className="flex items-center dark:!text-foreground hover:bg-hover-gradient hover:dark:bg-hover-gradient-dark focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark hover:!text-foreground focus:!text-foreground"
        >
          <List.ItemStart className="flex items-center mr-1.5">
            <Icon className="h-5 w-5" />
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
      <Menu.Trigger
        as={IconButton}
        size="sm"
        variant="ghost"
        color="secondary"
        className="flex items-center justify-center p-1 rounded-full h-8 w-8 text-foreground dark:text-foreground hover:!text-foreground focus:!text-foreground hover:bg-hover-gradient focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark"
      >
        <ProfileCircle className="h-6 w-6" />
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item
          as={Link}
          to="/profile"
          className="dark:text-foreground hover:bg-hover-gradient hover:dark:bg-hover-gradient-dark focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark hover:!text-foreground focus:!text-foreground"
        >
          <UserCircle className="mr-2 h-[18px] w-[18px]" /> Profile
        </Menu.Item>
        <Menu.Item
          as={Link}
          to="/preferences"
          className="dark:text-foreground hover:bg-hover-gradient hover:dark:bg-hover-gradient-dark focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark hover:!text-foreground focus:!text-foreground"
        >
          <Settings className="mr-2 h-[18px] w-[18px]" /> Preferences
        </Menu.Item>
        <hr className="!my-1 -mx-1 border-surface" />
        <Menu.Item
          as={Link}
          to="/login"
          className="text-error hover:bg-error/10 hover:!text-error focus:bg-error/10 focus:!text-error"
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
  const [isLightTheme, setIsLightTheme] = React.useState(true);

  function toggleTheme() {
    // Toggle light to dark theme and save to local storage
    setIsLightTheme(prev => {
      const newTheme = !prev;
      localStorage.setItem('theme', newTheme ? 'light' : 'dark');
      newTheme
        ? document.documentElement.classList.remove('dark')
        : document.documentElement.classList.add('dark');
      return newTheme;
    });
  }

  React.useEffect(() => {
    window.addEventListener(
      'resize',
      () => window.innerWidth >= 960 && setOpenNav(false)
    );
    // Set theme from local storage
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      setIsLightTheme(false);
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <Navbar className="mx-auto w-full rounded-none bg-background p-4 dark:shadow-surface">
      <div className="flex items-center justify-between ">
        {/* Logo */}
        <Link
          to="/"
          className="flex place-content-center transition transform duration-300 hover:scale-105"
        >
          <div className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center">
            <svg
              className="w-6 h-6 text-primary"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              fill="none"
              stroke="currentColor"
              version="1.1"
              id="svg3"
            >
              <path
                d="M7 2L16.5 2L21 6.5V19"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                id="path1"
              />
              <path
                d="M3 20.5V6.5C3 5.67157 3.67157 5 4.5 5H14.2515C14.4106 5 14.5632 5.06321 14.6757 5.17574L17.8243 8.32426C17.9368 8.43679 18 8.5894 18 8.74853V20.5C18 21.3284 17.3284 22 16.5 22H4.5C3.67157 22 3 21.3284 3 20.5Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                id="path2"
              />
              <path
                d="M14 5V8.4C14 8.73137 14.2686 9 14.6 9H18"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                id="path3"
              />
              <path
                d="m 4.748031,14.844736 c 2.3040582,-5.1504406 9.216233,-5.1504406 11.520291,0"
                stroke="currentColor"
                stroke-width="0.962864"
                stroke-linecap="round"
                stroke-linejoin="round"
                id="path1-7"
              />
              <path
                d="m 10.508177,17.419956 c -1.0604433,0 -1.920049,-0.864694 -1.920049,-1.931415 0,-1.06672 0.8596057,-1.931415 1.920049,-1.931415 1.060442,0 1.920048,0.864695 1.920048,1.931415 0,1.066721 -0.859606,1.931415 -1.920048,1.931415 z"
                stroke="currentColor"
                stroke-width="0.962864"
                stroke-linecap="round"
                stroke-linejoin="round"
                id="path2-9"
              />
            </svg>
            <Typography
              type="h6"
              className="ml-2 mr-2 block py-1 font-semibold pointer-events-none"
            >
              Janelia Fileglancer
            </Typography>
          </div>
        </Link>

        {/* Desktop menu links */}
        <div className="hidden lg:block">
          <List className="mt-4 flex flex-col gap-1 lg:mt-0 lg:flex-row lg:items-center">
            <NavList />
          </List>
        </div>

        {/* Theme toggle and profile dropdown menu */}
        <div className="flex items-center gap-1">
          <IconButton
            size="sm"
            variant="ghost"
            color="secondary"
            className="grid ml-auto text-foreground dark:text-foreground hover:!text-foreground focus:!text-foreground hover:bg-hover-gradient hover:dark:bg-hover-gradient-dark focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark stroke-2"
            onClick={toggleTheme}
          >
            {isLightTheme ? (
              <SunLight className="h-6 w-6" />
            ) : (
              <HalfMoon className="h-6 w-6" />
            )}
          </IconButton>
          <ProfileMenu />
          {/* Mobile menu links button */}
          <IconButton
            size="sm"
            variant="ghost"
            color="secondary"
            onClick={() => setOpenNav(!openNav)}
            className="mr-2 grid ml-auto text-foreground dark:text-foreground hover:!text-foreground focus:!text-foreground lg:hidden hover:bg-hover-gradient hover:dark:bg-hover-gradient-dark focus:bg-hover-gradient focus:dark:bg-hover-gradient-dark"
          >
            {openNav ? (
              <Xmark className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </IconButton>
        </div>
      </div>
      <Collapse open={openNav}>
        <NavList />
      </Collapse>
    </Navbar>
  );
}
