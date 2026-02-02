
import { yieldToFigma, formatNumber, getVariantsProduct } from "./utils.js";


function createNextKP(ifMaas) {
  const curPage = figma.root.children.find(p => p.name === "Assets");
  if (!curPage) return null;

  const templateName = ifMaas ? "MaaSKP_example" : "KP_example";
  const prefix = ifMaas ? "MaaSKP" : "KP";
  const regex = new RegExp(`^${prefix}\\d+$`);

  const template = curPage.children.find(
    n => n.type === "FRAME" && n.name === templateName
  );
  yieldToFigma();
  
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
  yieldToFigma();

  const lastFrame = frames.reduce((last, f) => {
    return !last || f.y > last.y ? f : last;
  }, null);

  kpFrame.x = template.x;
  kpFrame.y = lastFrame
    ? lastFrame.y + lastFrame.height + 40
    : template.y + template.height + 40;

  return { frame: kpFrame, index };
}

function putRectangle() {
  const rect = figma.createRectangle();
  rect.resize(1030, 2);
  rect.fills = [{ type: "SOLID", color: { r: 198 / 255, g: 207 / 255, b: 213 / 255 } }];
  return rect;
}

function deleteLast(frame) {
  const frameChildren = frame.children;
    if (frameChildren.length > 0) {
      const last = frameChildren[frameChildren.length - 1];
      yieldToFigma();
      last.remove();
    }
}

export async function loadOldSlides() {
  const pageRegex = new RegExp("^[A-Za-zА-Яа-яЁё]+ \\d{2}:\\d{2} \\d{2}\\.\\d{2}\\.\\d{4}$");
  const pages = figma.root.children.filter(n => pageRegex.test(n.name));
  let exportList = [];
  for (const item of pages){
    exportList.push({id: item.id, name: item.name})
  }
  return exportList;  
}

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

  page.children.forEach(section => {
    if (section.name != "Презентация БАЗА")
    {
      slides = section.children.map(slide => [slide.name, slide.id]);
      presentations.push({section: section.name, slides}); 
    }
    yieldToFigma();
  });

  return presentations;
}

async function updateTextInFrame(frame, textLayerName, newValue) {
  /*const frame = figma.currentPage.findOne(n => n.type === "FRAME" && n.name === frameName);
  if (!frame) {
    return false;
  }*/
  const textNode = frame.findOne(n => n.type === "TEXT" && n.name === textLayerName);
  if (!textNode) {
    return false;
  }
  await figma.loadFontAsync(textNode.fontName);
  textNode.characters = newValue;
  return true;
}


export async function createKPSlide(data, ifMaas) {
  let result;
  result = createNextKP(ifMaas);
  
  if (!result) {
    figma.notify("Фрейм не найден");
    throw new Error("Frame not found");
  }
  
  const { frame, index } = result;
  const frameKVProduct = frame.findOne(node => node.name === "KP_KV_products");
  const frameKVService = frame.findOne(node => node.name === "KP_KV_services");
  const frameAService = frame.findOne(node => node.name === "annual_services");
  yieldToFigma();
  let sumKP = 0;
  let sumAnnual = 0;

  if (!data) {
    return null;
  }
  const variantsProduct = getVariantsProduct();
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
            sumKP+= element[1]*element[3];
            frameKVService.appendChild(instance);
            frameKVService.appendChild(putRectangle());
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
            frameAService.appendChild(putRectangle());
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
            frameKVProduct.appendChild(putRectangle());
        }
    }
    yieldToFigma();
  }


  deleteLast(frameKVService);
  deleteLast(frameAService);
  deleteLast(frameKVProduct);

  if (frameKVService.children.length == 0) {
    frameKVService.visible = false;
  }

  await updateTextInFrame(frame, "sumKV", formatNumber(sumKP));
  await updateTextInFrame(frame, "sumAnnual", formatNumber(sumAnnual));

  yieldToFigma();

  return frame;
}


export function findSlide(slideID) {
  const page = figma.root.children.find(p => p.name == "Presentations");
  let sld = undefined;
  page.children.forEach(section => {
    const tmp = section.children.find(slide => slide.id == String(slideID));
    if (tmp) {sld = tmp;}
  });
  yieldToFigma();
  return sld;
}
