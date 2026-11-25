import * as XLSX from "xlsx-js-style";
const aoa=[["H02. Subpartida","H06. Descripcion","NOTA EXPLICATIVA"],["8413701100","Bomba centrifuga","Bomba 50mm"]];
const ws=XLSX.utils.aoa_to_sheet(aoa);
ws["!cols"]=[{wch:14},{wch:34},{wch:55}]; ws["!freeze"]={xSplit:0,ySplit:1};
const rng=XLSX.utils.decode_range(ws["!ref"]);
for(let r=rng.s.r;r<=rng.e.r;r++)for(let c=rng.s.c;c<=rng.e.c;c++){const cell=ws[XLSX.utils.encode_cell({r,c})];if(!cell)continue;cell.s=r===0?{font:{bold:true,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",fgColor:{rgb:c===2?"B8860F":"0E7C86"}}}:{font:{sz:9},fill:{patternType:"solid",fgColor:{rgb:"F3F8FA"}}};}
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Hoja1");
XLSX.writeFile(wb,"C:/Users/siste/AppData/Local/Temp/claude/9a0f51f9106711ad/c01b200c-a6d7-4173-bedd-aace747b1f0f/scratchpad/styled.xlsx");
console.log("escrito OK");
