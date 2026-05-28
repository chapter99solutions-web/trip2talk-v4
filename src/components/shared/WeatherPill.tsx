interface Props {
  temp: number;
  city: string;
  condition: 'sunny' | 'cloudy' | 'rainy';
}

function icon(condition: Props['condition']) {
  if (condition === 'sunny') return { glyph: '☀️', tone: '#EF9F27' };
  if (condition === 'rainy') return { glyph: '🌧️', tone: '#378ADD' };
  return { glyph: '☁️', tone: '#888' };
}

export default function WeatherPill({ temp, city, condition }: Props) {
  const i = icon(condition);
  return (
    <div className="inline-flex items-center gap-2 bg-white border border-sage-100 rounded-full px-3 py-1.5 shadow-sm">
      <span aria-hidden style={{ color: i.tone }}>
        {i.glyph}
      </span>
      <span className="text-[12px] font-medium text-[#1C1C1E]">
        {temp}°C · {city}
      </span>
    </div>
  );
}

