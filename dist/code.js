/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ./src/utils.js

let state = null;

const yieldToFigma = () =>  new Promise(resolve => setTimeout(resolve, 0));


async function initResources() {
  await figma.loadAllPagesAsync();
  const assetsPage = figma.root.children.find(p => p.name === "Assets");
  if (!assetsPage) return false;

  state = {
    // assetsPage,
    variantsProduct: figma.root.findOne(n => n.type === "COMPONENT_SET" && n.name === "Product"), // компонент со строками для рассчёта
    contactSlides: assetsPage.findOne(n => n.type === "SECTION" && n.name === "ContactSlides"), // контакты
    productSlides: assetsPage.findOne(n => n.type === "SECTION" && n.name === "productSlides"), // слайды с подробным описанием продуктов
    MaaSpage: assetsPage.findOne(n => n.type === "FRAME" && n.name === "MaaSdesc") // слайд для МааS
  };
  yieldToFigma();
  
  const allFound = Object.values(state).every(Boolean);
  state.allFound = allFound;
  return state;
}


function getMaaSpage () {
  if (state == null) return null;
  return state.MaaSpage;
}

function getProductSlides() {
  if (state == null) return null;
  return state.productSlides;
}

function getContactSlides() {
  if (state == null) return null;
  return state.contactSlides;
}

function getVariantsProduct() {
  if (state == null) return null;
  return state.variantsProduct;
}


function formatNumber(num) {
  return num
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}



/*async function collectSlidePreviews() {
  const page = figma.root.children.find(p => p.name === "Presentations");
  if (!page) {      
    figma.notify("Страница не найдена");
      throw new Error("Page not found");
  }
  
  const slides = [];
  page.children.forEach(section => {
    let newPresentation = [];
    let presentationName = section.name;
    let i = 1;
    section.children.forEach(async node => {
      const preview = await node.exportAsync({
        format: "PNG",
        constraint: { type: "WIDTH", value: 100 }
      });
      newPresentation.push({
        id:`{$presentationName}{$i}`,
        preview: Array.from(new Uint8Array(preview))
      });
      i+=1;
    });

    slides.push({
      prName: presentationName,
      contents: newPresentation
    });
  });

  figma.ui.postMessage({
    type: "slides-preview",
    slides
  });
}
*/


;// ./src/slides.js




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

async function loadOldSlides() {
  const pageRegex = new RegExp("^[A-Za-zА-Яа-яЁё]+ \\d{2}:\\d{2} \\d{2}\\.\\d{2}\\.\\d{4}$");
  const pages = figma.root.children.filter(n => pageRegex.test(n.name));
  let exportList = [];
  for (const item of pages){
    exportList.push({id: item.id, name: item.name})
  }
  return exportList;  
}

async function loadAllSlides() {
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


async function createKPSlide(data, ifMaas) {
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


function findSlide(slideID) {
  const page = figma.root.children.find(p => p.name == "Presentations");
  let sld = undefined;
  page.children.forEach(section => {
    const tmp = section.children.find(slide => slide.id == String(slideID));
    if (tmp) {sld = tmp;}
  });
  yieldToFigma();
  return sld;
}

;// ./src/code.js





async function init() {
  figma.notify("Загрузка плагина, всё нормик :)");

  const checkRes = await initResources();
  yieldToFigma();
  if (!checkRes.allFound) {
    figma.notify("Нет ресурсов для КП");
    return;
  }

  const presentations = await loadAllSlides();
  if (!presentations) {
    figma.notify("Нет ресурсов для КП");
    return;
  }

  figma.showUI(__html__, { width: 320, height: 420 });

  figma.ui.postMessage({
    type:"slides",
    data: JSON.stringify(presentations)
  });
}



init();



figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "my-json" :
      {
        const data = msg.data;

        try {

          let newPage = figma.createPage();
          let curDate = new Date();
          newPage.name = String(`${data['client']} ${String(curDate.getHours()).padStart(2, '0')}:${String(curDate.getMinutes()).padStart(2, '0')} ${String(curDate.getDate()).padStart(2, '0')}.${String(curDate.getMonth()+1).padStart(2, '0')}.${curDate.getFullYear()}`);

          if (!data['slides']) {
            figma.notify("Пустая презентация");
            throw new Error("Empty presentation");
          };

          // слайды из презентации
          let slideNum = 1;
          let y = 0;
          
          for (const slideID of data['slides']) {
           
            const slideTarget = findSlide(slideID);
            if (!slideTarget) {
              figma.notify("Нет слайда");
              throw new Error(`No slide for ${slideID}`);
            }
            const slideClone = slideTarget.clone();
            slideClone.name = `${slideNum}`;
            newPage.appendChild(slideClone);
            slideClone.x = 0;
            slideClone.y = y;
            y += slideClone.height + 60;
            slideNum+=1;
            
            yieldToFigma();
          }

          // слайд про МааС

          if (data['ifMaas']) {
            const MaaSclone = getMaaSpage().clone();
            newPage.appendChild(MaaSclone);
            MaaSclone.name = `${slideNum}`;
            MaaSclone.x = 0;
            MaaSclone.y = y;

            y += MaaSclone.height + 60;
            slideNum+=1;

            yieldToFigma();
          }

          // слайд с кп
          let KPframe = await createKPSlide(data['products'], data['ifMaas']);
          const KPclone = KPframe.clone();
          newPage.appendChild(KPclone);
          KPclone.name = `${slideNum}`;
          KPclone.x = 0;
          KPclone.y = y;

          y += KPclone.height + 60;
          slideNum+=1;

          yieldToFigma();


          // слайды с описанием оборудования
          const productSlides = getProductSlides();
          for (const element of (data['products'] || [])) {
            let productSlide = productSlides.findOne(node => node.name === element[0]);
            if (productSlide) {
             const productSlideClone = productSlide.clone();
              newPage.appendChild(productSlideClone);
              productSlideClone.name = `${slideNum}`;
              productSlideClone.x = 0;
              productSlideClone.y = y;
              y += productSlideClone.height + 60;
              slideNum+=1;      
            }
            yieldToFigma();
          }

          // слайд с контактами
          const contactSlides = getContactSlides();
          const contactSlide = contactSlides.children.find(node => node.name === data['creator']);
          if (!contactSlide) {
            throw new Error("No contact slide");
          }
          const contactClone = contactSlide.clone();
          newPage.appendChild(contactClone);
          contactClone.name = `${slideNum}`;
          contactClone.x = 0;
          contactClone.y = y;

          yieldToFigma();

          figma.ui.postMessage({
            type: "presentationCreated",
            data: newPage.name
          });
          
          await figma.setCurrentPageAsync(newPage);


        } catch (err) {
          console.error(err);
          figma.ui.postMessage({
            type: "showError",
            err
          });
        }
        break;
      }
    case "deleteKP" : {
      const page = figma.root.children.find(p => p.name === "Assets");
      const kpFrames = page.findAll(
        node =>
          node.type === "FRAME" &&
          /^(MaaSKP|KP)\d+$/.test(node.name)
      );
      for (const frame of kpFrames) {
        frame.remove()
        yieldToFigma();
      }
      
      figma.notify("Старые КП удалены");
      break;
    }
    case "deleteOld" : {
      const newRegex = new RegExp("^[A-Za-zА-Яа-яЁё]+ \\d{2}:\\d{2} \\d{2}\\.\\d{2}\\.\\d{4}$");;
      const pagesToRemove = figma.root.children.filter(page => newRegex.test(page.name));
      if (pagesToRemove.length === 0) {
        //figma.notify('Страницы с названием "Презентация" не найдены');
        return;
      }
      const currentPage = figma.currentPage;
      if (pagesToRemove.includes(currentPage)) {
        const anotherPage = figma.root.children.find(
          page => !pagesToRemove.includes(page)
        );
        if (!anotherPage) {
          figma.notify("Нельзя удалить все страницы документа");
          return;
        }
        await figma.setCurrentPageAsync(anotherPage);
        yieldToFigma();
      }
      for (let page of pagesToRemove) {
        page.remove();
        yieldToFigma();
      }
      figma.notify("Старые презентации удалены");
      break;
    }
    case "getImages" : {
      const pagename = msg.data;
      const page = figma.root.children.find(n => n.name === pagename);
      if (!page) {
        figma.ui.postMessage({
          type:"showError",
          data: "Нет страницы с презентацией"
        });
        return;        
      }
      let images = [];
      for (const frame of page.children) {
        if (frame.type === "FRAME") {
          const png = await frame.exportAsync({ format: "PNG", scale: 1 });
          images.push({ name: frame.name, bytes: png });
        }
        yieldToFigma();
      }

      figma.ui.postMessage({ type: "imagesReady", data: {images:images, name:pagename } });
      break;
    }
    case "getOldPresentations": {
      const oldSlides = await loadOldSlides();
      figma.ui.postMessage({ type: "showOldPresentations", data: JSON.stringify(oldSlides) });

      break;
    }
    case "thatsAll": {
      figma.closePlugin();
      break;
    }
    default: {
      figma.notify("Ничего не произошло");
    }

  }
};

/******/ })()
;