export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy';

export type CityWeather = {
  city: string;
  tempC: number;
  condition: WeatherCondition;
};

type GeoResult = { latitude: number; longitude: number; name: string; country?: string };

function conditionFromCode(code: number): WeatherCondition {
  // Open-Meteo weather codes: https://open-meteo.com/en/docs
  // 0 clear, 1-3 partly cloudy/overcast, 45-48 fog,
  // 51-67 drizzle/rain, 71-77 snow, 80-82 rain showers, 95-99 thunderstorms
  if ([0].includes(code)) return 'sunny';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return 'rainy';
  return 'cloudy';
}

async function geocodeCity(city: string): Promise<GeoResult | null> {
  const q = city.trim();
  if (!q) return null;
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`,
    { method: 'GET' }
  );
  if (!res.ok) throw new Error(`Weather geocoding failed: HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  const obj = json as { results?: GeoResult[] };
  const first = obj.results?.[0];
  if (!first) return null;
  return first;
}

export async function fetchCityWeather(city: string): Promise<CityWeather | null> {
  const geo = await geocodeCity(city);
  if (!geo) return null;

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weather_code&timezone=auto`,
    { method: 'GET' }
  );
  if (!res.ok) throw new Error(`Weather forecast failed: HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  const current = (json as { current?: { temperature_2m?: number; weather_code?: number } }).current;
  const temp = typeof current?.temperature_2m === 'number' ? current.temperature_2m : null;
  const code = typeof current?.weather_code === 'number' ? current.weather_code : 3;
  if (temp == null) return null;

  return {
    city: geo.name,
    tempC: Math.round(temp),
    condition: conditionFromCode(code),
  };
}

