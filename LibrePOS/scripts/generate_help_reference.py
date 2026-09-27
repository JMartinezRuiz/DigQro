#!/usr/bin/env python3
"""Generate the offline Markdown reference from the same guides used by the app."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
content = json.loads((ROOT / 'src/help-content.json').read_text())
lines = ['# Guías operativas de LibrePOS', '', f"Interfaz {content['interfaceVersion']} · Contenido {content['contentVersion']}", '',
         'La misma referencia está disponible en Ayuda → Tutoriales, con capturas y GIFs sin conexión a Internet. Los ejemplos son ficticios. Consulta la versión de cada captura; los pasos escritos describen la interfaz vigente.', '', '## Índice', '']
lines += [f"- [{a['title']}](#{a['id']})" for a in content['articles']]
for a in content['articles']:
    lines += ['', f'<a id="{a["id"]}"></a>', '', f"## {a['title']}", '', a['summary'], '', f"Para: {', '.join(a['audience'])}. Tiempo orientativo: {a['duration']}.", '', '### Antes de empezar', '']
    lines += [f'- {x}' for x in a['prerequisites']]
    lines += ['', '### Pasos', '']
    for i, step in enumerate(a['steps'], 1):
        lines += [f"{i}. **{step['title']}.** {step['detail']} Efecto: {step['impact']}", '']
    lines += ['### Ejemplo', '', f"**{a['example']['title']}.** {a['example']['detail']}", '', '### Si algo no funciona', '']
    for issue in a['troubleshooting']:
        lines += [f"- **{issue['symptom']}:** {issue['resolution']}"]
    lines += ['', '### Comprueba antes de terminar', '']
    lines += [f'- {x}' for x in a['verification']]
    lines += ['', '### Efectos de la operación', '']
    lines += [f'- {x}' for x in a['impacts']]
    lines += ['', f"**Atención:** {a['caution']}", '', f"**Resultado esperado:** {a['expected']}", '', 'Relacionadas: ' + ' · '.join(f'[{next(b["title"] for b in content["articles"] if b["id"] == id)}](#{id})' for id in a['related'])]
(ROOT / 'docs/GUIAS_OPERATIVAS.md').write_text('\n'.join(lines)+'\n')
