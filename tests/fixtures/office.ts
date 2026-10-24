import { zipSync, strToU8 } from "fflate";
/** Small OOXML archives with real namespace-qualified content for deterministic viewer tests. */
export function officeFixture(kind: "document" | "spreadsheet" | "presentation") {
  const parts: Record<string, string> =
    kind === "document"
      ? {
          "word/document.xml":
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Quarterly report &amp; review</w:t></w:r></w:p><w:p><w:r><w:t>Revenue grew this quarter.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Quarter</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Revenue</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Q1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>120</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>',
        }
      : kind === "spreadsheet"
        ? {
            "xl/workbook.xml":
              '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Revenue" sheetId="1" r:id="rId1"/><sheet name="Costs" sheetId="2" r:id="rId2"/></sheets></workbook>',
            "xl/_rels/workbook.xml.rels":
              '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
            "xl/sharedStrings.xml": "<sst><si><t>Quarter</t></si><si><t>Revenue</t></si></sst>",
            "xl/worksheets/sheet1.xml":
              '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Q1</t></is></c><c r="B2"><f>100+20</f><v>120</v></c></row></sheetData></worksheet>',
            "xl/worksheets/sheet2.xml":
              '<worksheet><sheetData><row r="4"><c r="C4"><v>42</v></c></row></sheetData></worksheet>',
          }
        : {
            "ppt/slides/slide1.xml":
              '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="600000" y="700000"/><a:ext cx="7800000" cy="1200000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr sz="3200"/><a:t>Project overview</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
            "ppt/slides/slide2.xml":
              '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><a:p><a:r><a:t>Next steps</a:t></a:r></a:p></p:cSld></p:sld>',
          };
  return zipSync(
    Object.fromEntries(Object.entries(parts).map(([path, content]) => [path, strToU8(content)])),
  );
}
