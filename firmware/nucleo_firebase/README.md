# AMG8831: NUCLEO -> ESP32 -> Firebase -> /testing

Este firmware se compila por separado de `nucleo_uart_test`, `ld2450_serial_test`
y `ld2450_firebase`; esos programas permanecen disponibles. La NUCLEO conserva
el envio UART5 del bloque que ya se verifico por USB: encabezado
`AMG8831 - grados C:` y ocho filas de ocho temperaturas con dos decimales.
No hay cambios adicionales que cargar en la NUCLEO para esta etapa.

## Antes de cargar la ESP32

1. Publica el contenido completo de `firebase/database.rules.json` en Firebase
   Console -> Realtime Database -> Reglas -> Publicar. Se agrego permiso para
   `telemetry/devices/robot-01/sensors/amg8831` con la misma cuenta dedicada que
   usa el radar. Los lectores anonimos siguen sin poder escribir.
2. Usa el archivo privado existente `firmware/.env.local`. El nuevo proyecto
   reutiliza su cargador sin mostrar las credenciales. Comprueba que la red WiFi
   guardada sea accesible desde donde esta la ESP32. Si la cambias, recompila.
3. Conserva PC12 -> GPIO16 y GND comun, con cada placa por su propio USB.
   GPIO17 -> PD2 es opcional; este firmware solo recibe por UART2.
4. Cierra el monitor serie antes de cargar.

Tambien puedes publicar las reglas usando Firebase CLI, con una sesion iniciada
que tenga permisos en el proyecto y sustituyendo `TU_PROJECT_ID` por el ID real:

```sh
cd /Users/duffed/Documents/github/thalos-web
firebase deploy --only database --config firebase/firebase.json --project TU_PROJECT_ID
```

La creacion y compilacion de estos archivos no publica las reglas, no despliega
la web y no carga ninguna placa.

## Compilar, cargar y observar

```sh
cd /Users/duffed/Documents/github/thalos-web/firmware/nucleo_firebase
/Users/duffed/.platformio/penv/bin/platformio run
/Users/duffed/.platformio/penv/bin/platformio run --target upload --upload-port /dev/cu.usbserial-0001
/Users/duffed/.platformio/penv/bin/platformio device monitor --port /dev/cu.usbserial-0001 --baud 115200 --dtr 0 --rts 0
```

El puerto es el de la ESP32 detectada en este Mac; puede cambiar. Deben aparecer
`WiFi: conectado`, el inicio de sesion de la cuenta de la ESP32 y
`Firebase OK | cuadro termico=... | 64 pixeles | HTTP=204` (tambien se acepta 200).
Hasta sincronizar el reloj, los cuadros se siguen recibiendo pero no se publican.
Si aparece 401/403, revisa las reglas publicadas y la cuenta del dispositivo.

Abre la web con `npm run dev` desde la raiz y entra a `/testing`, modo **En vivo**.
Se muestran el numero de cuadro, la hora de recepcion y la matriz de 8 x 8.
Acerca la mano y comprueba que cambian los cuadros y las temperaturas. Para probar
la perdida de datos, detén la NUCLEO sin cambiar conexiones energizadas; la web
marcara la ultima lectura como caducada despues de cinco segundos. La ESP32
puede seguir conectada y reportando su estado sin renovar la hora de la matriz.

Esta version recibe solo la matriz de la NUCLEO. El firmware anterior del radar
se conserva, pero no se ejecuta simultaneamente en la misma ESP32. El nodo del
radar no se borra ni se renueva artificialmente, y puede aparecer caducado.

## Datos y frescura

El nodo `telemetry/devices/robot-01/sensors/amg8831` contiene:

- `model: "AMG8831"`, `source: "sensor"`, `unit: "centicelsius"`.
- `width: 8`, `height: 8`, `pixels`: arreglo de 64 enteros, en orden de recepcion.
- `sequence`: contador local de la ESP32, que vuelve a empezar si se reinicia.
- `updatedAt`: milisegundos UTC al recibir el bloque completo en la ESP32,
  despues de sincronizar SNTP. No es un reloj de captura propio del sensor.

La web convierte los enteros a Celsius una sola vez. Las reglas requieren los
64 indices y validan tipo, limites del driver, metadatos y antiguedad. Una trama
UART incompleta o mal formada no reemplaza la ultima completa. No se fabrican
ceros al desconectar el sensor; una matriz real de ceros sigue siendo valida.

La tarea de HTTPS se ejecuta aparte de la recepcion UART. Solo conserva la ultima
matriz: no acumula lecturas durante cortes de WiFi. Reintentar no cambia su hora;
si ya tiene mas de tres segundos, solo publica el heartbeat de la ESP32.
La web marca matrices con mas de cinco segundos como caducadas y distingue una
perdida de Internet de una ESP32 sin reporte reciente.

HTTPS reutiliza los certificados publicos y el flujo de autenticacion del
firmware LD2450, con renovacion de tokens. El encabezado de configuracion privada
y los binarios estan excluidos de Git. No compartas el binario: incluye las
credenciales del dispositivo.

## Pruebas locales

Desde la raiz del repositorio:

```sh
npm test
npm run lint
npm run build
mkdir -p firmware/.build
clang++ -std=c++11 -Wall -Wextra -Werror -pedantic -fsanitize=address,undefined -I firmware/nucleo_firebase/.pio/libdeps/esp32dev/ArduinoJson/src firmware/tests/thermal_payload_test.cpp -o firmware/.build/thermal_payload_test
firmware/.build/thermal_payload_test
```

Para las reglas, inicia en otra terminal el emulador oficial (Firebase CLI
instalado) y ejecuta la prueba en el proyecto local `demo-thalos-rules`:

```sh
firebase emulators:start --only database --project demo-thalos-rules --config firebase/firebase.json
node --test firebase/tests/database-rules.test.mjs
```

Estas pruebas usan muestras sinteticas y exclusivamente `127.0.0.1:9005`.
No modifican la base de datos real.

Referencias: [PATCH y actualizaciones en multiples rutas](https://firebase.google.com/docs/database/rest/save-data),
[validacion y eliminaciones en reglas](https://firebase.google.com/docs/database/security/rules-conditions),
[estado de conexion y hora del servidor](https://firebase.google.com/docs/database/web/offline-capabilities).
