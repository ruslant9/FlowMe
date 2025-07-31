// Переменные, которые мы передадим из JavaScript
uniform sampler2D u_background; // Текстура с отрендеренным фоном
uniform float u_time; // Время для анимации искажений
uniform float u_blur; // Сила размытия
uniform vec2 u_resolution; // Разрешение экрана

// Координаты текстуры, полученные из вершинного шейдера
varying vec2 vUv;

// Простая функция для генерации псевдо-случайного шума
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Функция для создания плавного процедурного шума (Simplex/Perlin noise)
// Это создает более "органические" искажения, чем простой random
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
}

void main() {
    // Получаем текущие координаты пикселя на экране
    vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
    
    // --- 1. Создаем искажение (Distortion) ---
    // Используем функцию шума и время для создания плавно меняющихся "волн"
    vec2 distortionUv = screenUV;
    float noiseValue = noise(distortionUv * 5.0 + u_time * 0.1); // Масштабируем шум и анимируем его
    // Смещаем координаты для сэмплирования фона на основе шума. Это и есть эффект "линзы"
    vec2 distortedUv = screenUV + vec2(noiseValue - 0.5) * 0.03; // 0.03 - сила искажения

    // --- 2. Создаем размытие (Blur) ---
    // Мы сэмплируем фон несколько раз в небольшом радиусе и усредняем цвета
    vec4 finalColor = vec4(0.0);
    float total = 0.0;
    float blurAmount = u_blur / u_resolution.x; // Масштабируем размытие под разрешение

    for (float x = -4.0; x <= 4.0; x++) {
        for (float y = -4.0; y <= 4.0; y++) {
            // Сэмплируем фон со смещением и искажением
            vec2 offset = vec2(x, y) * blurAmount;
            finalColor += texture2D(u_background, distortedUv + offset);
            total++;
        }
    }

    // Усредняем результат
    finalColor /= total;
    
    // --- 3. Добавляем "шум" самого стекла ---
    float grain = random(screenUV * u_time) * 0.05; // Легкий анимированный шум
    finalColor.rgb += grain;

    // Выводим финальный цвет пикселя
    gl_FragColor = finalColor;
}