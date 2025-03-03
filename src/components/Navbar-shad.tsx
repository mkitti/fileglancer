import React from 'react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from './ui/navigation-menu';
import { Button } from './ui/button';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger
// } from './ui/dropdown-menu';
import {
  Archive,
  Headphones,
  LogOut,
  Menu,
  Files,
  User,
  Rocket,
  Settings,
  Boxes,
  UserCircle
} from 'lucide-react';

const LINKS = [
  {
    icon: User,
    title: 'Account',
    href: '#'
  },
  {
    icon: Boxes,
    title: 'Blocks',
    href: '#'
  },
  {
    icon: Archive,
    title: 'Docs',
    href: '#'
  }
];

const PagesContent = () => (
  <div className="grid w-[600px] gap-3 p-4">
    <div className="flex">
      <div className="col-span-2 bg-primary text-primary-foreground rounded-lg p-4 flex items-center justify-center">
        <div className="text-center">
          <Rocket className="h-12 w-12 mx-auto" />
          <h3 className="mt-4 text-lg font-semibold">Material Tailwind PRO</h3>
        </div>
      </div>
      <div className="col-span-3 ml-4 space-y-3">
        <MenuItem
          title="@material-tailwind/html"
          description="Learn how to use @material-tailwind/html, packed with rich components and widgets."
        />
        <MenuItem
          title="@material-tailwind/react"
          description="Learn how to use @material-tailwind/react, packed with rich components for React."
        />
        <MenuItem
          title="Material Tailwind PRO"
          description="A complete set of UI Elements for building faster websites in less time."
        />
      </div>
    </div>
  </div>
);

const MenuItem = ({
  title,
  description
}: {
  title: string;
  description: string;
}) => (
  <NavigationMenuLink asChild>
    <a
      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
      href="#"
    >
      <div className="text-sm font-medium leading-none">{title}</div>
      <p className="text-sm leading-snug text-muted-foreground">
        {description}
      </p>
    </a>
  </NavigationMenuLink>
);

export default function NavigationMenuDemo() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="w-full border-b">
      <div className="mx-auto w-full max-w-screen-xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a href="#" className="text-sm font-semibold">
              Material Tailwind
            </a>
            <div className="mx-4 hidden h-5 w-px bg-border lg:block" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="flex items-center gap-1">
                    <Files className="h-4 w-4" />
                    Pages
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <PagesContent />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {LINKS.map(({ icon: Icon, title, href }) => (
                  <NavigationMenuItem key={title}>
                    <NavigationMenuLink
                      href={href}
                      className="flex items-center gap-1.5 px-4 py-2"
                    >
                      <Icon className="h-4 w-4" />
                      {title}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Mobile menu button and Profile */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Profile Menu */}
            <div className="relative">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-9 w-9 rounded-full border border-primary p-0">
                      <UserCircle className="h-5 w-5" />
                    </NavigationMenuTrigger>
                    <NavigationMenuContent
                      className="absolute right-0 min-w-[200px] origin-top-right"
                      forceMount
                    >
                      <div className="p-1 bg-popover rounded-md border shadow-md">
                        <NavigationMenuLink asChild>
                          <a className="group flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                            <User className="h-4 w-4" />
                            My Profile
                          </a>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <a className="group flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                            <Settings className="h-4 w-4" />
                            Edit Profile
                          </a>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <a className="group flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                            <Headphones className="h-4 w-4" />
                            Support
                          </a>
                        </NavigationMenuLink>
                        <div className="mx-1 my-1 h-px bg-muted" />
                        <NavigationMenuLink asChild>
                          <a className="group flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <LogOut className="h-4 w-4" />
                            Logout
                          </a>
                        </NavigationMenuLink>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <div className="space-y-2 pb-3 pt-2">
              {LINKS.map(({ icon: Icon, title, href }) => (
                <a
                  key={title}
                  href={href}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm hover:bg-accent rounded-md"
                >
                  <Icon className="h-4 w-4" />
                  {title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
