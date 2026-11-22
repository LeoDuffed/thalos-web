# NUCLEO UART5 -> ESP32 UART2 -> USB: matriz termica

Prueba local independiente del firmware Firebase. ESP32-WROOM-32, `esp32dev`,
`espressif32@6.12.0`, Arduino; UART2 y USB a 115200, 8N1.

## Cableado

- NUCLEO PC12 (UART5 TX) -> ESP32 GPIO16 (RX2).
- GND comun. Cada placa se alimenta por su propio USB.
- GPIO17 (TX2) -> PD2 (UART5 RX) es opcional: esta prueba solo recibe en la ESP32.

## Cambio manual en la NUCLEO

No se ha editado el repositorio ThalosRobot. En `CM7/Core/Src/main.c`, dentro de
`StartThermalTask`, elimina el bloque que transmite `THALOS UART OK`.

Dentro del `if (AMG88XX_ReadPixels(&thermal, temperatures) == HAL_OK)`, conserva
el armado de `message` y su `UART_Print(message);`. Inmediatamente despues agrega:

```c
// Enviar la misma matriz por UART5 hacia la ESP32.
if (HAL_UART_Transmit(&huart5,
                      (const uint8_t *)message,
                      (uint16_t)strlen(message),
                      200U) != HAL_OK) {
    UART_Print("UART5: fallo al enviar matriz termica\r\n");
}
```

Ese `UART_Print(message)` conserva la salida existente por USART3 al USB de la
NUCLEO. El nuevo envio no incluye el terminador NUL de la cadena. `string.h` ya
esta incluido en el archivo actual. Compila y carga CM7 desde STM32CubeIDE.

## Formato recibido

Una lectura consta de `AMG8831 - grados C:` y ocho filas con ocho temperaturas
cada una, separadas por espacios y con exactamente dos decimales. Las lineas
terminan en CRLF o LF. Se conserva el orden del arreglo del driver.

El receptor valida el formato completo antes de imprimir las 64 temperaturas.
Mantiene los valores internamente en centesimas de grado, sin redondeos de float.
Rechaza filas con valores faltantes, adicionales o mal formados y lineas demasiado
largas. Descarta cuadros incompletos tras 1.5 s y se sincroniza al siguiente
encabezado. Si pasan 3 s sin un cuadro completo, informa falta de datos; no
imprime una matriz de ceros ni vuelve a presentar la anterior como nueva.
El mensaje antiguo `THALOS UART OK` se reconoce como prueba del enlace, pero no
cuenta como una lectura termica.

Cada cuadro se imprime con un contador y luego un bloque de 8 x 8 que se puede
copiar a la prueba termica de la web seleccionando grados Celsius. Copia desde
`AMG8831 - grados C:` hasta la octava fila, sin el contador ni los avisos.

## ESP32: compilar, cargar y observar

```sh
cd /Users/duffed/Documents/github/thalos-web/firmware/nucleo_uart_test
/Users/duffed/.platformio/penv/bin/platformio run
/Users/duffed/.platformio/penv/bin/platformio run --target upload --upload-port /dev/cu.usbserial-0001
/Users/duffed/.platformio/penv/bin/platformio device monitor --port /dev/cu.usbserial-0001 --baud 115200 --dtr 0 --rts 0
```

El puerto corresponde a la ESP32 detectada en este Mac; puede cambiar.
Cierra el monitor con Ctrl+C antes de cargar. La preparacion de estos archivos
no carga ninguna placa ni modifica el firmware Firebase.

## Verificacion del receptor sin placas

Desde la raiz de `thalos-web`:

```sh
mkdir -p firmware/.build
clang++ -std=c++11 -Wall -Wextra -Werror -pedantic -fsanitize=address,undefined firmware/tests/nucleo_thermal_parser_test.cpp -o firmware/.build/nucleo_thermal_parser_test
firmware/.build/nucleo_thermal_parser_test
```

Las muestras de estas pruebas son sinteticas, solo se usan en la computadora y
no se envian a las placas ni a Firebase. La prueba cubre valores negativos y
cero, orden de pixeles, fragmentacion UART, cuadros consecutivos, recuperacion
tras truncamiento, datos invalidos, limites de buffers y vencimiento de tiempo.
