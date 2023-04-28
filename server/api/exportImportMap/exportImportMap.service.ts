import { getExportImportMaps } from "./exportImportMap.repository";

export async function findCodeNodes() {
  const allExportImportMaps = await getExportImportMaps();
  console.log(allExportImportMaps.length);
  // console.log(allExportImportMaps);

  // const getCountsOfImportsById = (exportImportMaps: any) => {
  //   const countsOfImportsById: any = {};
  //   for (let i = 0; i < exportImportMaps.length; i++) {
  //     const exportImportMap = exportImportMaps[i];
  //     const { import_id, name } = exportImportMap;
  //     if (!countsOfImportsById[import_id]) {
  //       countsOfImportsById[import_id] = 0;
  //       countsOfImportsById.name = name;
  //     }
  //     countsOfImportsById[import_id]++;
  //   }
  //   return countsOfImportsById;
  // };

  const getCountsOfExportsById = (exportImportMaps: any) => {
    const countsOfExportsById: {
      export_id: number;
      name: string;
      count: number;
    }[] = [];
    for (let i = 0; i < exportImportMaps.length; i++) {
      const exportImportMap = exportImportMaps[i];
      const { export_id, code_snippet } = exportImportMap;
      if (!countsOfExportsById[export_id]) {
        countsOfExportsById.push({
          export_id,
          name: code_snippet.name,
          count: 0,
        });
      }
      const toUpdate = countsOfExportsById.find(
        (item) => item.export_id === export_id
      );
      if (toUpdate) {
        toUpdate.count++;
      }
    }
    return countsOfExportsById;
  };

  // console.log("Imports:", getCountsOfImportsById(allExportImportMaps));

  console.log(
    "Exports:",
    getCountsOfExportsById(allExportImportMaps).filter((item) => item.count > 5)
  );
}
