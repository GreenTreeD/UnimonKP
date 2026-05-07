
import { yieldToFigma, formatNumber, getVariantsProduct } from "./utils.js";


async function createNextKP(type) {
  const curPage = figma.root.children.find(p => p.name === "Assets");
  if (!curPage) return null;

  let templateName = null;
  let prefix = null;
  if (type == "maas") {

    templateName = "MaaSKP_example";
    prefix = "MaaSKP";
  }
  else {
    templateName = "KP_example";
    prefix = "KP";
  }

  const regex = new RegExp(`^${prefix}\\d+$`);

  const template = curPage.children.find(
    n => n.type === "FRAME" && n.name === templateName
  );
  await yieldToFigma();
  
  if (!template) return null;

  const frames = curPage.children.filter(
    n => n.type === "FRAME" && regex.test(n.name)
  );
  let maxIndex = 0;

  maxIndex = frames.reduce((max, f) => {
    const n = Number(f.name.replace(prefix, ""));
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const index = maxIndex + 1;

  const kpFrame = template.clone();
  kpFrame.name = `${prefix}${index}`;
  template.parent.appendChild(kpFrame);
  await yieldToFigma();

  const lastFrame = frames.reduce((last, f) => {
    return !last || f.y > last.y ? f : last;
  }, null);

  kpFrame.x = template.x;
  kpFrame.y = lastFrame
    ? lastFrame.y + lastFrame.height + 40
    : template.y + template.height + 40;

  return { frame: kpFrame, index };
}

function putRectangle(size) {
  const rect = figma.createRectangle();
  if (size == "small") {
    rect.resize(1030, 2);
  } else {
    rect.resize(1540, 2);
  }
  
  rect.fills = [{ type: "SOLID", color: { r: 198 / 255, g: 207 / 255, b: 213 / 255 } }];
  return rect;
}

async function deleteLast(frame) {
  const frameChildren = frame.children;
    if (frameChildren.length > 0) {
      const last = frameChildren[frameChildren.length - 1];
      await yieldToFigma();
      last.remove();
    }
}

export async function loadOldSlides() {
  const pageRegex = new RegExp(/^[A-Za-zА-Яа-яЁё_0-9]+ \d{2}:\d{2} \d{2}\.\d{2}\.\d{4}$/);
  const pages = figma.root.children.filter(page => (page.name != "Assets" & page.name != "Presentations"));
  let exportList = [];
  for (const item of pages){
    exportList.push({id: item.id, name: item.name})
  }
  console.log(exportList);
  return exportList;  
}

/*
export async function loadAllSlides() {
  const page = figma.root.children.find(p => p.name === "Presentations");
  if (!page) {      
    figma.notify("Страница не найдена");
      throw new Error("Page not found");
  }

  const presentations = [];

  const basePresentation = page.children.find(p => p.name === "Презентация БАЗА");
  let slides = basePresentation.children.map(slide => [slide.name, slide.id]);
  presentations.push({section: basePresentation.name, slides});

  for (const section of page.children) {
    if (section.name != "Презентация БАЗА")
    {
      slides = section.children.map(slide => [slide.name, slide.id]);
      presentations.push({section: section.name, slides}); 
    }
    await yieldToFigma();
  }

  return presentations;
}*/

export async function loadAllSlides() {
  const page = figma.root.children.find(p => p.name === "Assets");
  if (!page) {      
    figma.notify("Страница не найдена");
      throw new Error("Page not found");
  }
  const presSection = page.findOne(n => n.type === "SECTION" && n.name === "Presentations");

  const presentations = [];

  for (const section of presSection.children) {
    let slides = section.children.map(slide => [slide.name, slide.id]);
    presentations.push({section: section.name, slides}); 
    await yieldToFigma();
  }

  return presentations;
}

async function updateTextInFrame(frame, textLayerName, newValue) {
  if (!frame) {
    return false;
  }
  const textNodes = frame.findAll(n => n.type === "TEXT" && n.name === textLayerName);
  if (textNodes.length === 0) {
    return false;
  }
  for (const item of textNodes) {
    await figma.loadFontAsync(item.fontName);
    await yieldToFigma();
    item.characters = newValue;
  }
  return true;
}


export async function createKPSlide(data, type) {
  let result = await createNextKP(type);
  
  if (!result) {
    figma.notify("Фрейм не найден");
    throw new Error("Frame not found");
  }
  
  const { frame, index } = result;
  await yieldToFigma();
  if (!data) {
    return null;
  }
  const variantsProduct = getVariantsProduct();
  if (type != 'maas') {
    let sumKP = 0;
    let sumAnnual = 0;
    const frameKVProduct = frame.findOne(node => node.name === "KP_KV_products");
    const frameKVService = frame.findOne(node => node.name === "KP_KV_services");
    const frameAService = frame.findOne(node => node.name === "annual_services");
    for (const element of data) {
      let variant = variantsProduct.children.find(v => v.variantProperties["Variant"] === element[0]);
  
      if (!variant) {
          variant = variantsProduct.children.find(v => v.variantProperties["Variant"] === "Default");
          figma.notify("Вариант не найден");
        }
      const instance = variant.createInstance();
      switch (element[0].slice(0,3)) {
          case 'US-': {
              instance.setProperties({ 
              //"Count#70:3": String(element[1]), 
              //"Price#70:4": formatNumber(element[3]), 
              "Value#70:5": formatNumber(element[1]*element[3])
              });
            if (element[0] == "US-Maintenance") {
              sumAnnual+=element[1]*element[3];
              frameAService.appendChild(instance);
              frameAService.appendChild(putRectangle("small"));
            }
            else {
              sumKP+= element[1]*element[3];
              frameKVService.appendChild(instance);
              frameKVService.appendChild(putRectangle("small"));
            }
              break;
          }
          case 'CC-': 
          case 'CL-': {
              instance.setProperties({ 
              "Count#70:3": String(element[1]), 
              "Price#70:4": formatNumber(element[3]), 
              "Value#70:5": formatNumber(element[1]*element[3])
              });
              sumAnnual+=element[1]*element[3];
              frameAService.appendChild(instance);
              frameAService.appendChild(putRectangle("small"));
              break;
          }
          default: {
              instance.setProperties({ 
              "Count#70:3": String(element[1]), 
              "Price#70:4": formatNumber(element[3]), 
              "Value#70:5": formatNumber(element[1]*element[3])
              });
              sumKP+= element[1]*element[3];
              frameKVProduct.appendChild(instance);
              frameKVProduct.appendChild(putRectangle("small"));
          }
      }
      await yieldToFigma();
    }

    deleteLast(frameKVService);
    deleteLast(frameAService);
    deleteLast(frameKVProduct);

    if (frameKVService.children.length == 0) {
      frameKVService.visible = false;
    }

    await updateTextInFrame(frame, "sumKV", formatNumber(sumKP));
    await updateTextInFrame(frame, "sumAnnual", formatNumber(sumAnnual));
  }
  else {
    let sumMonthly = 0;
    let sumStart = 0;
    const frameKVProduct = frame.findOne(node => node.name === "KP_KV_products");
    for (const element of data) {
      let variant = variantsProduct.children.find(v => v.variantProperties["Variant"] === element[0]);
  
      if (!variant) {
          variant = variantsProduct.children.find(v => v.variantProperties["Variant"] === "Default");
          figma.notify("Вариант не найден");
        }
      const instance = variant.createInstance();
      switch (element[0].slice(0,3)) {
          case 'US-':
          {
            if (element[0] == "US-Setup" || element[0] == "US-Install") {
              sumStart+=element[3];
            }
            break;
          }
          case 'CC-': 
          case 'CL-': {
              break;
          }
          default: {
              instance.setProperties({ 
              "Count#70:3": String(element[1]), 
              "Price#70:4": formatNumber(element[4]), 
              "Value#70:5": formatNumber(element[1]*element[4])
              });
              sumMonthly+= element[1]*element[4];
              instance.resize(1630, instance.height);
              frameKVProduct.appendChild(instance);
              frameKVProduct.appendChild(putRectangle("big"));
          }
      }
      await yieldToFigma();
    }
    deleteLast(frameKVProduct);
    await updateTextInFrame(frame, "RentSum", formatNumber(sumMonthly));
    await updateTextInFrame(frame, "ConfigSum", formatNumber(sumStart));

  }

  await yieldToFigma();

  return frame;
}


export async function findSlide(slideID) {
  const page = figma.root.children.find(p => p.name == "Presentations");
  let sld = undefined;
  
  for (const section of page.children) {
    const tmp = section.children.find(slide => slide.id == String(slideID));
    if (tmp) {sld = tmp;}
  }
  await yieldToFigma();
  return sld;
}


export async function createRentalSlide(info) {
    const curPage = figma.root.children.find(p => p.name === "Assets");
    if (!curPage) return null;

    const template = curPage.findOne(n => n.type === "FRAME" && n.name === "rental");
    if (!template) return null;
    const clone = template.clone();
    clone.name = "RENTAL_CLONE";

    await yieldToFigma();
    await updateTextInFrame(clone, "ConfigSum", formatNumber(info['ConfigSum']));
    await updateTextInFrame(clone, "RentSum", formatNumber(info['RentSum']));
    await updateTextInFrame(clone, "ServiceSum", formatNumber(info['ServiceSum']));

    await yieldToFigma();

    const table = clone.findOne(n => n.name === "table");

    const datatable = info['table'];


    let equipmentSum = 0;
    for (const row of table.children) {

      if (row.name.startsWith("row")) {
        const j = Number(row.name.slice(3,4))-1;

        await updateTextInFrame(row, "CloudSum", formatNumber(datatable[j]['CloudSum']));
        equipmentSum+=datatable[j]['CloudSum'];
        await updateTextInFrame(row, "GSMSum", formatNumber(datatable[j]['GSMSum']));
        equipmentSum+=datatable[j]['GSMSum'];
        await updateTextInFrame(row, "GuaranteeSum", formatNumber(datatable[j]['GuaranteeSum']));
        equipmentSum+=datatable[j]['GuaranteeSum'];
        await updateTextInFrame(row, "DispatcherSum", formatNumber(datatable[j]['DispatcherSum']));
        equipmentSum+=datatable[j]['DispatcherSum'];
        await updateTextInFrame(row, "VisitSum", formatNumber(datatable[j]['VisitSum']));
        equipmentSum+=datatable[j]['VisitSum'];
        await updateTextInFrame(row, "BatterySum", formatNumber(datatable[j]['BatterySum']));
        equipmentSum+=datatable[j]['BatterySum'];
        await updateTextInFrame(row, "VerifSum", formatNumber(datatable[j]['VerifSum']));
        equipmentSum+=datatable[j]['VerifSum'];
      }
      await yieldToFigma();
    }
    await updateTextInFrame(clone,"MaaSsum", formatNumber(equipmentSum));
    await updateTextInFrame(clone,"sumPerMonth", formatNumber(info['ServiceSum']-info['RentSum']));
    await updateTextInFrame(clone,"perDay", formatNumber(info['ServiceSumPerDay']));
    
    return clone;
  
}

export async function createOperationalCostsSlide(info) {
  const curPage = figma.root.children.find(p => p.name === "Assets");
  if (!curPage) return null;

  const template = curPage.findOne(n => n.type === "FRAME" && n.name === "operating_costs");
  if (!template) return null;
  const clone = template.clone();
  clone.name = "OPERATIONAL_CLONE";
  let opCostMonthly = 0;

  await updateTextInFrame(clone, "GSMSumMonthly", formatNumber(info['GSMSumMonthly']));
  opCostMonthly+=info['GSMSumMonthly'];

  await updateTextInFrame(clone, "GuaranteeSumMonthly", formatNumber(info['GuaranteeSumMonthly']));
  opCostMonthly+=info['GuaranteeSumMonthly'];

  await updateTextInFrame(clone, "DispatcherSumMonthly", formatNumber(info['DispatcherSumMonthly']));
  opCostMonthly+=info['DispatcherSumMonthly'];

  await updateTextInFrame(clone, "VisitSumMonthly", formatNumber(info['VisitSumMonthly']));
  opCostMonthly+=info['VisitSumMonthly'];

  await updateTextInFrame(clone, "BatterySum", formatNumber(info['BatterySum']));
  await updateTextInFrame(clone, "VerifSum", formatNumber(info['VerifSum']));
  await updateTextInFrame(clone, "opCostMonthly", formatNumber(opCostMonthly));
  await yieldToFigma();

  return clone;
}

export async function loadAllContacts() {
  const curPage = figma.root.children.find(p => p.name === "Assets");
  if (!curPage) return null;

  const section = curPage.findOne(n => n.type === "SECTION" && n.name === "ContactSlides");
  if (!section) return null;
  let contacts = [];
  for (const slide of section.children) contacts.push(slide.name);
  return contacts;

}