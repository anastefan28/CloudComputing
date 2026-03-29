import { Router } from 'express';
import { getCampsites, getCampsite, getCampsiteReviews } from '../services/campsiteService.js';
import { getWeatherByCoords, getForecastByCoords} from '../services/weatherService.js';
import { getStaticMap } from '../services/mapService.js';
export const campsiteRouter = Router();

campsiteRouter.get('/', async (req, res, next) => {
  try {
    const campsites = await getCampsites(req.query);
    res.json(campsites);
  } catch (err) {
    next(err);
  }
});

campsiteRouter.get('/:id', async (req, res, next) => {
  try {
    const [campsite, reviews] = await Promise.all([
      getCampsite(req.params.id),
      getCampsiteReviews(req.params.id),
    ]);

    let weather = null, forecast = null, mapUrl = null;
    try {
      [weather, forecast] = await Promise.all([
        getWeatherByCoords(campsite.lat, campsite.lon),
        getForecastByCoords(campsite.lat, campsite.lon),
      ]);
      mapUrl = await getStaticMap(campsite.lat, campsite.lon);
      console.log('Map URL:', mapUrl);

    } catch (weatherErr) {
      console.warn('Weather/map fetch failed:', weatherErr.message);
    }

    res.json({ campsite, reviews, weather, forecast, mapUrl });
  } catch (err) {
    next(err);
  }
});