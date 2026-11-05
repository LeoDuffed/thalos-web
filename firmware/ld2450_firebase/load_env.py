"""Lee las credenciales locales sin incluirlas en los argumentos del compilador ni en los registros."""
Import("env")
from pathlib import Path
import json
import os
import re
from urllib.parse import urlsplit

project = Path(env.subst("$PROJECT_DIR"))
source = project.parent / ".env.local"
check_only = os.environ.get("THALOS_BUILD_CHECK") == "1"
fields = {
    "WIFI_SSID": "kWifiSsid", "WIFI_PASSWORD": "kWifiPassword",
    "FIREBASE_API_KEY": "kFirebaseApiKey",
    "FIREBASE_DATABASE_URL": "kFirebaseDatabaseUrl",
    "FIREBASE_EMAIL": "kFirebaseEmail", "FIREBASE_PASSWORD": "kFirebasePassword",
    "FIREBASE_EXPECTED_UID": "kFirebaseExpectedUid", "THALOS_DEVICE_ID": "kDeviceId",
}
values = {}
if check_only:
    values = dict.fromkeys(fields, "build-check-only")
    values["FIREBASE_DATABASE_URL"] = "https://build-check.firebaseio.com"
else:
    if not source.is_file():
        raise RuntimeError("Copia firmware/.env.example a firmware/.env.local y completa las credenciales.")
    for number, line in enumerate(source.read_text().splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise RuntimeError("Formato env invalido en linea %d" % number)
        name, value = line.split("=", 1)
        name, value = name.strip(), value.strip()
        if name in values:
            raise RuntimeError("Campo repetido en linea %d" % number)
        if value.startswith("\""):
            try:
                value = json.loads(value)
            except ValueError:
                raise RuntimeError("Comillas dobles invalidas en linea %d" % number) from None
        elif value.startswith("'"):
            if not value.endswith("'") or len(value) < 2:
                raise RuntimeError("Comillas simples invalidas en linea %d" % number)
            value = value[1:-1]
        if not isinstance(value, str) or any(ord(c) < 32 for c in value):
            raise RuntimeError("Valor invalido en linea %d" % number)
        values[name] = value
    missing = [name for name in fields if not values.get(name) and name != "WIFI_PASSWORD"]
    if missing:
        raise RuntimeError("Completa firmware/.env.local: " + ", ".join(missing))
    values.setdefault("WIFI_PASSWORD", "")
    url = urlsplit(values["FIREBASE_DATABASE_URL"])
    if url.scheme != "https" or url.username or url.password or url.query or url.fragment or url.path not in ("", "/") or not url.hostname or not url.hostname.endswith((".firebaseio.com", ".firebasedatabase.app")):
        raise RuntimeError("FIREBASE_DATABASE_URL debe ser la URL HTTPS de Realtime Database, sin rutas ni tokens.")
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", values["THALOS_DEVICE_ID"]):
        raise RuntimeError("THALOS_DEVICE_ID invalido")
    if len(values["WIFI_SSID"].encode()) > 32:
        raise RuntimeError("El nombre de WiFi supera 32 bytes")
    values["FIREBASE_DATABASE_URL"] = values["FIREBASE_DATABASE_URL"].rstrip("/")

generated = Path(env.subst("$BUILD_DIR")) / "private"
generated.mkdir(parents=True, exist_ok=True)
header = generated / "thalos_config.h"
content = "#pragma once\n// Generado localmente. Contiene credenciales; nunca incluir en Git.\n"
content += "static const bool kThalosConfigReady = %s;\n" % ("false" if check_only else "true")
content += "".join("static const char %s[] = %s;\n" % (symbol, json.dumps(values[name], ensure_ascii=True)) for name, symbol in fields.items())
if not header.exists() or header.read_text() != content:
    header.write_text(content)
header.chmod(0o600)
env.Append(CPPPATH=[str(generated)])
print("Thalos: compilacion de comprobacion SIN credenciales" if check_only else "Thalos: configuracion privada cargada (valores ocultos)")
