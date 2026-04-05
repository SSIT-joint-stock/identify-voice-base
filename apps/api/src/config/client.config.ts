import { registerAs } from '@nestjs/config';

export default registerAs('client', () => ({
  postcodesApi: process.env.GET_API_AREA || 'https://api.postcodes.io',
  photonApi: process.env.PHOTON_API_URL || 'https://photon.komoot.io/api/',
}));
