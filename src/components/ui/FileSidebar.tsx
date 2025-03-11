import React from 'react';
import {
  Card,
  Collapse,
  Typography,
  List,
  Input
} from '@material-tailwind/react';
import { Folder, Search, NavArrowRight, Server } from 'iconoir-react';

import { FileSharePaths } from '../../hooks/useFileBrowser';

type FileSidebarProps = {
  fileSharePaths: FileSharePaths;
  openZones: Record<string, boolean>;
  toggleZone: (zone: string) => void;
  onPathClick: (path: string) => void;
};

export default function FileSidebar({
  fileSharePaths,
  openZones,
  toggleZone,
  onPathClick
}: FileSidebarProps) {
  return (
    <Card className="max-w-[280px] h-full rounded-none">
      <Card.Header className="mx-3 mb-0 mt-3 flex h-max items-center gap-2">
        <Server className="h-5 w-5" />
        <Typography className="font-semibold">Zones</Typography>
      </Card.Header>
      <Card.Body className="p-3">
        <Input type="search" placeholder="Search here...">
          <Input.Icon>
            <Search className="h-full w-full" />
          </Input.Icon>
        </Input>
        <List className="mt-3">
          {Object.entries(fileSharePaths).map(([zone, paths]) => {
            const isOpen = openZones[zone] || false;
            return (
              <React.Fragment key={zone}>
                <List.Item onClick={() => toggleZone(zone)}>
                  <List.ItemStart>
                    <Server className="h-[18px] w-[18px]" />
                  </List.ItemStart>
                  {zone}
                  <List.ItemEnd>
                    <NavArrowRight
                      className={`h-4 w-4 ${isOpen ? 'rotate-90' : ''}`}
                    />
                  </List.ItemEnd>
                </List.Item>
                <Collapse open={isOpen}>
                  <List>
                    {paths.map((path: string) => (
                      <List.Item
                        key={`${zone}-${path}`}
                        onClick={() => onPathClick(path)}
                        className="cursor-pointer"
                      >
                        <List.ItemStart>
                          <Folder className="h-[18px] w-[18px]" />
                        </List.ItemStart>
                        {path}
                      </List.Item>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          })}
          <hr className="-mx-3 my-3 border-secondary" />
        </List>
      </Card.Body>
    </Card>
  );
}
