# ESP32 + HLK-LD2450: USB y Firebase

Hay dos programas: `ld2450_serial_test` verifica lecturas por USB y `ld2450_firebase` envía las mismas lecturas a Firebase por WiFi/HTTPS. La prueba USB se conserva como respaldo. Ninguno modifica la configuración del radar.

## Conexiones

Para la placa ESP32-WROOM-32 con las etiquetas RX2/TX2 de la foto:

| Sensor HLK-LD2450 | ESP32 |
| --- | --- |
| 5V | VIN / 5V del USB |
| GND | GND |
| TX | RX2 / GPIO16 |
| RX | TX2 / GPIO17 |

Haz el cableado sin alimentación. Alimenta la ESP32 por USB y usa solamente esa fuente para esta primera prueba. El sensor requiere 5 V, con una fuente capaz de suministrar más de 200 mA para el módulo; no lo alimentes desde 3V3. Sus señales UART son TTL de 3.3 V: los 5 V son solo alimentación, nunca una señal hacia un GPIO.

En placas compatibles, verifica que VIN entregue aproximadamente 5 V cuando se alimentan por USB. Si el pin no ofrece esa tensión, hay que revisar la placa antes de alimentar el sensor; no asumir la distribución de otra versión. En el módulo de la foto usa las etiquetas 5V/GND/TX/RX, no colores del cable ni los pines PA9, DP, DM o 3V3. No se necesita el Elegoo.

## Arduino IDE

1. Abre ld2450_serial_test/ld2450_serial_test.ino. El archivo Ld2450Parser.h debe permanecer en la misma carpeta.
2. Instala el paquete oficial "esp32 by Espressif Systems" si aún no está instalado. Su índice estable es https://espressif.github.io/arduino-esp32/package_esp32_index.json.
3. Selecciona la placa "ESP32 Dev Module" y el puerto USB correspondiente a la placa. Deja el resto de opciones por defecto; se puede reducir Upload Speed a 115200 si hay problemas al cargar.
4. Compila y carga el programa.
5. Abre el monitor serie a 115200 baudios. El enlace separado con el sensor usa 256000 baudios (8N1).
6. Deja el sensor fijo mirando al frente y camina delante. Deben cambiar X, Y, distancia y velocidad.

Si la carga permanece en "Connecting...", puede ser necesario mantener BOOT pulsado al iniciar la carga y soltarlo al comenzar la escritura. Si el programa ya está cargado y el monitor no muestra el inicio, pulsa EN una vez.

## Lecturas esperadas

~~~text
Muestra #42 | objetivos=1 | antiguedad=40 ms
 T1 | X=-782 mm | Y=1713 mm | distancia=1.883 m | velocidad=-16 cm/s | angulo=-24.5 grados | resolucion=320 mm
~~~

Las cifras anteriores son el ejemplo del fabricante, no una lectura realizada en tu placa.

- Una trama válida con cero objetivos se muestra como tal.
- Si dejan de llegar tramas durante dos segundos, muestra SIN TRAMAS VIGENTES; nunca fabrica un cero.
- Si bytes permanece en cero: revisar alimentación, GND común, TX del sensor hacia RX2 de la ESP y el cable.
- Si hay bytes pero ninguna trama válida: revisar TX/RX, velocidad del sensor (256000 por defecto), alimentación estable y conexiones.
- Si la placa se reinicia continuamente al conectar el sensor: revisar cable USB, alimentación y posibles cortos antes de continuar.
- El signo de X/Y/velocidad es el formato particular del fabricante, no complemento a dos. La resolución no es un porcentaje de confianza.
- T1–T3 son ranuras de seguimiento, no identidades de personas.

## Comprobación del programa

Desde la raíz del repositorio, con las herramientas instaladas:

~~~sh
mkdir -p firmware/.build
clang++ -std=c++11 -Wall -Wextra -Werror firmware/tests/ld2450_parser_test.cpp -o firmware/.build/ld2450_parser_test
firmware/.build/ld2450_parser_test
arduino-cli compile --fqbn esp32:esp32:esp32 --build-path firmware/.build/esp32 firmware/ld2450_serial_test
~~~

Referencias: [protocolo del fabricante, secciones 1.2 y 2.3](https://h.hlktech.com/download/HLK-LD2450-24G/1/LD2450%20%E4%B8%B2%E5%8F%A3%E9%80%9A%E4%BF%A1%E5%8D%8F%E8%AE%AE%20V1.03.pdf), [HardwareSerial de Arduino-ESP32](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/serial.html).

El envío por WiFi está preparado en `ld2450_firebase`, con credenciales locales excluidas de Git y separadas de la configuración del navegador. Sigue los pasos de la sección siguiente.

## Configuración de PlatformIO

La carpeta del programa incluye platformio.ini con la plataforma espressif32 6.12.0 y la placa esp32dev para esta prueba USB. La configuración permite compilar el mismo archivo .ino desde PlatformIO; no cambia los pines ni las velocidades.

Desde firmware/ld2450_serial_test:

~~~sh
platformio run
platformio run --target upload --upload-port /dev/cu.usbserial-0001
platformio device monitor --port /dev/cu.usbserial-0001 --baud 115200
~~~

El puerto mostrado es un ejemplo del Mac usado en esta prueba; puede cambiar al conectar otra placa. Cierra el monitor serie antes de volver a cargar el programa.

## Verificación realizada

El 4 de noviembre de 2026 se compiló y cargó este programa con PlatformIO (espressif32 6.12.0, Arduino-ESP32 2.0.17) en la ESP32 conectada por USB. En una captura de 20 segundos se recibieron 40 reportes, todos con un objetivo y con coordenadas variables, sin mensajes de pérdida de tramas. La captura local está excluida de Git en firmware/.build/first-readings.log. Esta primera prueba validó sensor → UART → ESP32 → USB. En una prueba posterior del mismo día se cargó el firmware HTTPS: la ESP32 se autenticó y Firebase confirmó escrituras HTTP 204 con uno y cero objetivos. Dos lecturas autenticadas de la base mostraron el avance de secuencia de 411 a 445 y nuevas horas de captura, con `source: sensor`. Las capturas locales de esas pruebas están excluidas de Git en `firmware/.build/`. También se verificó el centro de control con la cuenta anónima de la web: Firebase conectado, ESP32 con reporte vigente y radar recibiendo; se mostró un objetivo a 0.63 m y posteriormente una trama válida de cero objetivos. Durante una interrupción del radar, la página mantuvo los últimos datos como caducados mientras la ESP32 seguía reportando; al reconectar el hardware regresaron las lecturas vigentes.



El 5 de noviembre de 2026 se cargaron las credenciales de la red escolar desde el archivo local privado. Se verificaron conexión WiFi, autenticación y escrituras aceptadas por Firebase. Dos consultas de la base recibieron lecturas reales vigentes con un objetivo y secuencias 19 y 26, con nuevas horas de captura. La captura USB y el último reporte consultado están excluidos de Git en `firmware/.build/school-network-2026-11-05.log` y `firmware/.build/school-cloud-device.json`.

## Envío a Firebase por WiFi/HTTPS

1. Conserva el cableado ya verificado y la alimentación USB. La ESP32 usa WiFi de 2.4 GHz con nombre y contraseña; este programa no configura redes empresariales con portal o identidad institucional.
2. En Firebase Authentication, mantén Anónimo habilitado para la web, habilita Correo electrónico/contraseña y crea una cuenta dedicada a esta ESP32. Su UID debe coincidir con el de `firebase/database.rules.json` y con `FIREBASE_EXPECTED_UID` del archivo local.
3. Copia `firmware/.env.example` a `firmware/.env.local`. Completa WiFi y correo/contraseña de esa cuenta. En este Mac el archivo local ya está creado y tiene la configuración pública de Firebase y el UID. No pegues contraseñas en el chat. Los valores son literales: no hay expansión de variables ni ejecución de comandos. Para contraseñas con caracteres especiales usa comillas simples; también se admiten cadenas entre comillas dobles con escapes JSON.
4. Publica el contenido completo de `firebase/database.rules.json` en Realtime Database → Reglas. Solo esa cuenta puede escribir estado y radar de `robot-01`. La web conserva lectura anónima autenticada; eventos y otros dispositivos no admiten escritura de esta cuenta.
5. Desde `firmware/ld2450_firebase`, compila y carga con PlatformIO:

~~~sh
platformio run
platformio run --target upload --upload-port /dev/cu.usbserial-0001
platformio device monitor --port /dev/cu.usbserial-0001 --baud 115200
~~~

El monitor debe mostrar `WiFi: conectado`, `Firebase: cuenta de la ESP32 autenticada` y luego `Firebase OK`. El programa solo muestra códigos de respuesta y datos del radar; no imprime contraseñas, correo ni tokens.

### Cómo publica

- La UART se lee en el núcleo de Arduino mientras una tarea separada maneja WiFi y HTTPS.
- Se verifica el certificado del servidor con las raíces públicas de Google Trust Services. El reloj se sincroniza por SNTP antes de autenticar o transmitir.
- El dispositivo inicia sesión con la cuenta dedicada, verifica su UID y renueva automáticamente el token antes de caducar.
- Se hace PATCH a `telemetry/devices/robot-01`, reemplazando `status` y la lectura completa `sensors/ld2450` en una operación. Al bajar el conteo se eliminan las ranuras antiguas.
- Se envía como máximo una petición cada 500 ms. Se reutiliza la conexión HTTPS cuando el servidor lo permite; la frecuencia real puede ser menor por la latencia de la red. No se acumulan lecturas sin conexión; se toma la última al reintentar.
- Solo se publica radar si llegó una nueva trama en el último segundo y ya tiene hora UTC de captura. El momento de captura no cambia durante un reintento. Una petición lenta puede aparecer caducada en la web, en vez de mostrarse como una medición nueva.
- Sin trama nueva solo se renueva el estado de la ESP32, aproximadamente cada dos segundos. Una trama válida de cero objetivos sí publica cero. Una UART desconectada nunca fabrica un cero ni renueva `updatedAt`.
- No se guarda un historial de cada trama ni se escriben eventos remotos en esta versión.

### Archivos privados y compilación

`load_env.py` lee `firmware/.env.local` y genera un encabezado privado dentro de `.pio/build/esp32dev/private`. No pone contraseñas en los argumentos del compilador. Tanto el archivo local como `.pio` están excluidos de Git; el archivo de configuración y el encabezado tienen permisos locales de solo lectura/escritura para el usuario. Las credenciales quedan incluidas en el binario para que la ESP32 pueda usarlas: no compartas los archivos compilados ni la memoria flash como si fueran públicos.

Para comprobar que compila sin tener credenciales se puede ejecutar `THALOS_BUILD_CHECK=1 platformio run`. Ese binario **desactiva WiFi**, muestra una advertencia y sirve únicamente para compilación. La siguiente compilación normal vuelve a generar la configuración real.

El certificado público `GoogleRoots.h` procede de https://pki.goog/roots.pem, descargado el 4 de noviembre de 2026. Si cambian las raíces de los servicios o caducan, hay que actualizarlo desde esa fuente y volver a compilar; no desactivar la verificación TLS.

### Si hay problemas

- WiFi no conecta: comprobar nombre/contraseña, señal y disponibilidad de 2.4 GHz. Una red de invitados con portal puede impedir el acceso aunque haya señal.
- Esperando hora: la red debe permitir sincronización de hora e Internet.
- Acceso no completado: comprobar correo/contraseña de la cuenta de Firebase, proveedor habilitado, API key y UID. El correo es el de la cuenta del dispositivo, no necesariamente el del propietario del proyecto.
- HTTP 401/403 al enviar: comprobar que se publicaron las nuevas reglas y que el UID y `robot-01` coinciden. También revisar la hora: las reglas rechazan mediciones antiguas o muy futuras. Un rechazo aplica espera entre reintentos.
- Firebase OK pero radar sin tramas: revisar UART y alimentación. El estado de ESP32 puede seguir vigente mientras el sensor queda caducado.
- Para volver a la prueba USB, carga `ld2450_serial_test` con su propio `platformio.ini`.

### Pruebas del envío

Después de instalar las dependencias con la primera compilación, desde la raíz:

~~~sh
clang++ -std=c++11 -Wall -Wextra -Werror -I firmware/ld2450_firebase/.pio/libdeps/esp32dev/ArduinoJson/src firmware/tests/telemetry_payload_test.cpp -o firmware/.build/telemetry_payload_test
firmware/.build/telemetry_payload_test
~~~

La prueba comprueba que no se publiquen ceros falsos, tramas repetidas o caducadas; también verifica el signo de coordenadas/velocidad, la ranura del objetivo, el cambio a cero objetivos y el desbordamiento del contador de tiempo.

Las reglas se prueban con el emulador oficial de Realtime Database en `127.0.0.1:9005`. Con el emulador en marcha, ejecuta `node --test firebase/tests/database-rules.test.mjs`. La prueba usa exclusivamente el espacio local `demo-thalos-rules`, instala las reglas locales y comprueba lecturas, escritura del UID permitido, bloqueos de otros usuarios, formato, eliminaciones parciales y permisos de otros dispositivos. No usa credenciales reales ni conecta a la nube.

Referencias: [inicio y renovación de sesión REST](https://firebase.google.com/docs/reference/rest/auth), [escrituras PATCH y marcas de tiempo](https://firebase.google.com/docs/database/rest/save-data), [autenticación de Realtime Database por REST](https://firebase.google.com/docs/database/rest/auth), [reglas por UID](https://firebase.google.com/docs/database/security/rules-conditions), [certificados públicos de Google](https://pki.goog/repository/).
