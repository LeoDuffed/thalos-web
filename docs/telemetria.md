# Configuración técnica y formato de datos

React + TypeScript + Vite. El centro de control muestra un robot fijo con un radar HLK-LD2450, conectado a Firebase Realtime Database. Las páginas de inicio y solución conservan su contenido previo.

Todos los comandos y las rutas de esta guía parten de la raíz del repositorio. Para empezar, consulta [cómo funciona](como-funciona.md) o el [README principal](../README.md).

## Configuración local

Copia `.env.example` a `.env.local` y completa la configuración de la aplicación web que entrega Firebase. En esta computadora `.env.local` ya está configurado. `VITE_TELEMETRY_DEVICE_ID` selecciona el único dispositivo, por defecto `robot-01`.

Los archivos `.env` y `.env.*` están excluidos de Git, excepto `.env.example`. Los valores con prefijo `VITE_` terminan en el navegador: aquí solo debe ir la configuración **pública** del SDK web. Contraseñas WiFi, contraseñas de dispositivos, claves de cuentas de servicio y tokens administrativos deben mantenerse en el firmware o en un backend, fuera del código del navegador y fuera de Git. Reinicia Vite al cambiar variables.

```sh
npm install
npm run dev
```

Abre la dirección de Vite y visita `/dashboard`. No hay un servidor de demostración que deba quedar ejecutándose de forma permanente.

```sh
npm run build
npm run lint
npm test
```

Las pruebas usan Node.js 22.18 o posterior.

## Acceso a Firebase

Habilita Authentication → Método de acceso → Anónimo para la web, y Correo electrónico/contraseña para la cuenta dedicada de la ESP32. Publica `firebase/database.rules.json` en Realtime Database → Reglas. Solo el UID de esa cuenta puede escribir `telemetry/devices/robot-01/status` y `telemetry/devices/robot-01/sensors/ld2450`; las reglas también validan el formato de los reportes. Las demás escrituras de clientes siguen bloqueadas. La lectura de `telemetry` está permitida a cualquier sesión autenticada, incluidas las anónimas: es telemetría de demo accesible desde la página.

## Contrato para la ESP32

La página escucha estas rutas, sin mezclar las antiguas zonas y la flota:

- `telemetry/devices/robot-01/status`
- `telemetry/devices/robot-01/sensors/ld2450`
- Los últimos 50 registros de `telemetry/events`, filtrados por `deviceId`.

Sustituye `robot-01` si cambias `VITE_TELEMETRY_DEVICE_ID`.

### Estado de la ESP32

`lastSeenAt`: marca de tiempo del servidor en milisegundos, renovada con el reporte periódico. Opcionales: `firmware` (texto) y `wifiRssiDbm` (número). No publicar contraseñas ni identificadores privados en esta ruta de lectura de demo.

### Última trama válida del radar

```json
{
  "model": "HLK-LD2450",
  "source": "sensor",
  "updatedAt": 1800000000000,
  "sequence": 42,
  "targetCount": 1,
  "targets": {
    "1": {
      "active": true,
      "xMm": -782,
      "yMm": 1713,
      "speedCms": -16,
      "resolutionMm": 320
    }
  }
}
```

El tiempo anterior es ilustrativo. El firmware usa la marca de tiempo del servidor de Firebase para `lastSeenAt` y la hora UTC de captura del radar para `updatedAt`, con el reloj de la ESP32 sincronizado por SNTP antes de transmitir. Así una petición HTTPS lenta no hace parecer nueva una lectura antigua. `updatedAt` solo avanza con una nueva trama UART válida; un heartbeat sin radar no lo modifica. `sequence` cuenta las tramas válidas. El firmware publica estado y lectura de forma atómica mediante PATCH, con un intervalo mínimo de 500 ms entre intentos; la frecuencia efectiva depende de la red.

Las claves `1`, `2`, `3` son ranuras de seguimiento, no personas identificadas permanentemente. Cada objetivo activo incluye X/Y en milímetros, velocidad con signo en centímetros por segundo y resolución en milímetros. No se publica confianza ni clasificación humano/animal: esos campos no vienen en la trama. La web calcula distancia con `hypot(X,Y)` y ángulo frontal con `atan2(X,Y)`.

Una trama válida sin objetivos usa `targetCount: 0` y omite `targets`. La web también interpreta ranuras con `active: false` de datos previos; las reglas del emisor actual solo aceptan objetivos activos y omiten las ranuras ausentes. No envíes un objetivo activo con los cuatro valores en cero: el protocolo lo usa para ranura ausente. El conteo debe coincidir con los objetivos activos. Ante UART desconectado o trama inválida, conserva el último reporte y deja que expire, en lugar de fabricar un conteo cero.

El firmware debe decodificar el formato little-endian del fabricante. Los campos X/Y/velocidad tienen signo con una codificación particular (bit alto 1 = positivo); no basta reinterpretar bytes como enteros convencionales en complemento a dos. Conserva el signo de la velocidad, sin presentarla como un vector XY. Referencia: [protocolo oficial, página 14](https://h.hlktech.com/download/HLK-LD2450-24G/1/LD2450%20%E4%B8%B2%E5%8F%A3%E9%80%9A%E4%BF%A1%E5%8D%8F%E8%AE%AE%20V1.03.pdf).

### Eventos opcionales

Cada entrada de `telemetry/events/{eventId}` incluye `deviceId`, `timestamp` en milisegundos, `event`, `detail` y `source` (`sensor` o `simulated`). Registra cambios de estado o conteo, no cada trama. La página añade eventos de conexión y cambios de conteo en memoria, claramente etiquetados como actividad de esta sesión web; no los escribe en Firebase.

## Ejemplo y migración

No se han eliminado ni migrado datos existentes en Firebase. Las antiguas rutas `robots` y `zones` quedan fuera del nuevo centro de control.

`firebase/examples/ld2450-demo.json` contiene **solo** una lectura simulada para importar o pegar en `telemetry/devices/robot-01/sensors/ld2450`. No importes ese archivo en la raíz de la base. `firebase/examples/seed-demo.json` contiene la estructura completa para una base nueva y vacía; importarla en una raíz con datos los reemplazaría.

El ejemplo está etiquetado `source: simulated` y no crea un heartbeat falso de la ESP32. Su fecha es fija, así que los puntos se mostrarán como última lectura y los indicadores vigentes quedarán pendientes. La llegada de una muestra real con `source: sensor`, marcas de tiempo recientes y el heartbeat del dispositivo sustituirá esa lectura.

## Comportamiento del tablero

- Firebase conectado solo confirma la conexión de la página a la base.
- La ESP32 necesita un `lastSeenAt` de los últimos 15 segundos.
- El radar necesita una trama válida de los últimos 5 segundos y un reporte vigente de la ESP32 para mostrarse recibiendo datos reales.
- Una lectura cero vigente se distingue de ausencia de lectura, lectura incompleta y datos desactualizados. El reloj se ajusta con el desfase del servidor Firebase.
- El radar usa vista espejo horizontal: el signo de X y del ángulo se conserva en los datos y la tabla; su posición en el gráfico se refleja junto con las etiquetas de los ejes.
- El gráfico representa el campo frontal nominal de 6 m y ±60°. Los objetivos fuera de esa vista no se recortan ni se mueven artificialmente: siguen en la tabla.
- Coordenadas, velocidad y resolución provienen del sensor; distancia y ángulo son calculados. La resolución no es confianza ni exactitud garantizada.

## Prueba física del sensor

Las conexiones, la prueba real por USB y el programa de envío por WiFi/HTTPS están en [guía de la ESP32](../firmware/README.md). Las credenciales del dispositivo se guardan aparte en `firmware/.env.local`, nunca en variables `VITE_`.
