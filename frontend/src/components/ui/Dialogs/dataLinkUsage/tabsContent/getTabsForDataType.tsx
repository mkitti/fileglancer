import getFijiTab from '@/components/ui/Dialogs/dataLinkUsage/tabsContent/getFijiTab';
// import getJavaTab from '@/components/ui/Dialogs/dataLinkUsage/tabsContent/getJavaTab';
import getNapariTab from '@/components/ui/Dialogs/dataLinkUsage/tabsContent/getNapariTab';
import getPythonTab from '@/components/ui/Dialogs/dataLinkUsage/tabsContent/getPythonTab';
import getVvdViewerTab from '@/components/ui/Dialogs/dataLinkUsage/tabsContent/getVvdViewerTab';

import type {
  DataLinkType,
  ZarrVersion
} from '@/components/ui/Dialogs/dataLinkUsage/DataLinkUsageDialog';

export default function getTabsForDataType(
  dataType: DataLinkType,
  dataLinkUrl: string,
  tooltipTriggerClasses: string,
  zarrVersion?: ZarrVersion
) {
  if (dataType === 'directory') {
    return [
      // getJavaTab(dataType, dataLinkUrl, tooltipTriggerClasses, zarrVersion),
      getPythonTab(dataType, dataLinkUrl, tooltipTriggerClasses)
    ];
  }

  if (dataType === 'ome-zarr') {
    const tabs = [
      getFijiTab(),
      // getJavaTab(dataType, dataLinkUrl, tooltipTriggerClasses, zarrVersion),
      ...(zarrVersion === 2
        ? [getNapariTab(dataLinkUrl, tooltipTriggerClasses)]
        : []),
      getPythonTab(dataType, dataLinkUrl, tooltipTriggerClasses, zarrVersion),
      getVvdViewerTab()
    ];
    return tabs;
  }

  if (dataType === 'zarr') {
    return [
      getFijiTab(),
      // getJavaTab(dataType, dataLinkUrl, tooltipTriggerClasses, zarrVersion),
      getPythonTab(dataType, dataLinkUrl, tooltipTriggerClasses)
    ];
  }

  // dataType === 'n5'
  return [
    getFijiTab(),
    // getJavaTab(dataType, dataLinkUrl, tooltipTriggerClasses, zarrVersion),
    getPythonTab(dataType, dataLinkUrl, tooltipTriggerClasses)
  ];
}
