import jsdom from 'jsdom';
import cliProgress from 'cli-progress';
import fs from 'fs';
import { promisify } from 'util';
const { JSDOM } = jsdom;

const sleep = promisify(setTimeout);

const MAIN_URL = 'https://www.bbcgoodfood.com/recipes';

/**
 * Get HREF attributes from selectors in given URL
 * @param {string} url URL to scrap
 * @param {string} selector Selector to search in the DOM
 * @returns {array} List of href found
 */
const getHrefAttrsFromUrlWithSelector = async (url, selector) => {
  try {
    const { window } = await JSDOM.fromURL(url);

    const selectors = window.document.querySelectorAll(selector);

    const urls = new Set();
    for (const selector of selectors) {
      urls.add(selector.href);
    }
    return [...urls];
  } catch (error) {
    console.error('Failed scraping', error.message);
    throw error;
  }
};

/**
 * Get all recipes URLs
 * @returns {Set} List containing all URLs
 */
const getAllRecipesUrls = async () => {
  // Get all URLs that contains list of recipes
  const recipeUrls = await getHrefAttrsFromUrlWithSelector(
    `${MAIN_URL}/collection/quick-veggie-recipes`,
    'a.pagination-item'
  );
  recipeUrls.unshift(`${MAIN_URL}/collection/quick-veggie-recipes`); // add first page to list

  // Then, scrap each of those pages and get the URL of each recipe
  const allRecipesLinks = new Set();
  for (const url of recipeUrls) {
    const recipeLinksFromUrl = await getHrefAttrsFromUrlWithSelector(
      url,
      'a.standard-card-new__article-title.qa-card-link'
    );
    recipeLinksFromUrl.forEach((link) => allRecipesLinks.add(link));
  }

  return allRecipesLinks;
};

/**
 * Scrap and save recipe in JSON format
 * @param {string} url Recipe url
 */
const scrapAndSaveRecipeUrl = async (url, filename) => {
  const { window } = await JSDOM.fromURL(url);
  const { document } = window;
  const recipe = {
    url: url,
    title: null,
    image: null,
    description: null,
    ingredients: [],
    steps: []
  };

  // Title
  recipe.title = document.querySelector('h1').textContent;
  // Image
  recipe.image = document
    .querySelector('.masthead__image')
    .querySelector('img').src;

  // Description
  recipe.description = document
    .querySelector('.masthead__body')
    .querySelector('.editor-content').textContent;

  // Ingredients
  const ingredients = [];
  const ingredientsParent = document.querySelector(
    '.recipe-template__ingredients'
  );
  for (const ingredient of ingredientsParent.getElementsByTagName('li')) {
    ingredients.push(ingredient.textContent);
  }
  recipe.ingredients = ingredients;

  // Steps
  const steps = [];
  const stepsParent = document.querySelector('.recipe-template__method-steps');
  for (const step of stepsParent.getElementsByTagName('li')) {
    steps.push(step.querySelector('.editor-content').textContent);
  }
  recipe.steps = steps;

  fs.writeFile(
    `recipes/${filename}.json`,
    JSON.stringify(recipe, null, 2),
    (err) => {
      if (err) {
        console.error(`Failed saving recipe ${recipe.slug}`, err);
        throw err;
      }
    }
  );
};

const init = async () => {
  const recipesUrls = await getAllRecipesUrls();

  const progressBar = new cliProgress.SingleBar(
    {
      format: '{bar} |' + '| {value}/{total} recipes || Recipe: {recipe}'
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(recipesUrls.size, 0, {
    recipe: 'N/A'
  });
  if (!fs.existsSync('recipes')) {
    fs.mkdirSync('recipes');
  }

  let index = 0;
  for (const url of recipesUrls) {
    index++;
    progressBar.update(index, {
      recipe: url
    });
    // get the last occurrence of / and extract the text after it. This is the slug
    const filename = url.substr(url.lastIndexOf('/') + 1);
    // avoid scraping existing recipe
    if (fs.existsSync(`recipes/${filename}.json`)) {
      continue;
    }
    try {
      await scrapAndSaveRecipeUrl(url);
    } catch (error) {
      console.error(error.message);
    }
    await sleep(3000); // to avoid server denying your requests
  }

  progressBar.update(recipesUrls.length);
  progressBar.stop();
};

init();
