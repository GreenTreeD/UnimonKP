
let state = null;

export const yieldToFigma = () =>  new Promise(resolve => setTimeout(resolve, 0));


export async function initResources() {
  await figma.loadAllPagesAsync();
  const assetsPage = figma.root.children.find(p => p.name === "Assets");
  if (!assetsPage) return false;

  state = {
    // assetsPage,
    variantsProduct: figma.root.findOne(n => n.type === "COMPONENT_SET" && n.name === "Product"), // компонент со строками для рассчёта
    contactSlides: assetsPage.findOne(n => n.type === "SECTION" && n.name === "ContactSlides"), // контакты
    productSlides: assetsPage.findOne(n => n.type === "SECTION" && n.name === "productSlides"), // слайды с подробным описанием продуктов
    MaaSpage: assetsPage.findOne(n => n.type === "FRAME" && n.name === "MaaSdesc"), // слайд для МааS
  };
  yieldToFigma();
  
  const allFound = Object.values(state).every(Boolean);
  state.allFound = allFound;
  return state;
}


export function getMaaSpage () {
  if (state == null) return null;
  return state.MaaSpage;
}

export function getProductSlides() {
  if (state == null) return null;
  return state.productSlides;
}

export function getContactSlides() {
  if (state == null) return null;
  return state.contactSlides;
}

export function getVariantsProduct() {
  if (state == null) return null;
  return state.variantsProduct;
}

export function formatNumber(num) {
  num = Math.floor(num);
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

