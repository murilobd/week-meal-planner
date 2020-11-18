import axios from 'axios';
import fs from 'fs';
import cliProgress from 'cli-progress';
import { promisify } from 'util';

const MAIN_URL = 'https://panelinha-api-server-prod.herokuapp.com/v1';
const sleep = promisify(setTimeout);
/**
 * @param {number} page Page number
 * @param {array} slugs Array with slugs from previous request
 */
const getRecipesSlugs = async (page = 1, slugs = []) => {
  try {
    const resp = await axios.get(`${MAIN_URL}/search`, {
      params: {
        pageType: 'receita',
        cuisine: 'vegetariana',
        pageSize: 100,
        pageNumber: page
      }
    });

    const recipes = resp.data.data.results;
    const paging = resp.data.paging;
    const new_slugs = recipes.reduce(
      (acc, recipe) => [...acc, recipe.slug],
      slugs
    );

    // paging.continue is provided by the API. Thanks guys =)
    if (paging.continue) {
      // call the same function passing along the next page and the already retrieved slugs
      return getRecipesSlugs(paging.nextPage.pageNumber, new_slugs);
    } else {
      return new_slugs;
    }
  } catch (error) {
    console.error(
      'Failed getting recipes slugs from Panelinha.com.br',
      error.message
    );
    throw error;
  }
};

/**
 * @param {array} slugs List of all slugs
 */
const writeSlugsToFile = async (slugs) => {
  fs.writeFile('slugs.json', JSON.stringify(slugs), (error) => {
    if (error) {
      console.error('Failed writing slugs to file', error.message);
    }
  });
  return slugs;
};

/**
 * @param {string} slug Recipe slug
 */
const getRecipeBySlug = async (slug) => {
  try {
    const resp = await axios.get(`${MAIN_URL}/receita/${slug}/null`);
    return resp.data.data;
  } catch (error) {
    console.error(`Failed getting recipe ${slug}`, error.message);
    return { error: error.message, slug };
  }
};

/**
 * @param {object} recipe Recipe in JSON format
 */
const saveRecipe = (recipe) => {
  fs.writeFile(`recipes/${recipe.slug}.json`, JSON.stringify(recipe), (err) => {
    if (err) {
      console.error(`Failed saving recipe ${recipe.slug}`, err);
    }
  });
};

/**
 * @param {array} slugs Array with all recipes slugs
 */
const getRecipesBySlugAndSave = async (slugs) => {
  const progressBar = new cliProgress.SingleBar(
    {
      format: '{bar} |' + '| {value}/{total} recipes || Recipe: {recipe}'
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(slugs.length, 0, {
    recipe: 'N/A'
  });
  if (!fs.existsSync('recipes')) {
    fs.mkdirSync('recipes');
  }

  let index = 0;
  for (const slug of slugs) {
    index++;
    progressBar.update(index, {
      recipe: slug
    });
    const recipe = await getRecipeBySlug(slug);
    saveRecipe(recipe);
    await sleep(3000); // to avoid server denying your requests
  }

  progressBar.update(slugs.length);
  progressBar.stop();
};

getRecipesSlugs()
  .then(writeSlugsToFile)
  .then(getRecipesBySlugAndSave)
  .catch(console.error);
