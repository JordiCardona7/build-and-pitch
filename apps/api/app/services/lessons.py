"""Lecciones de la Pizarra Viva.

Cada tipo de error tiene un CONSTRUCTOR que arma la clase con los números reales del alumno
(tortillas, barras, fracciones, círculos rojos). No dependen de internet. Grok se usa para
aclaraciones cuando el alumno interrumpe (/lessons/ask) y para evaluar su explicación.
Pizarra lógica: 1000 × 600. Formato de ops: docs/CONTRACTS.md §3.
"""
import logging
from fractions import Fraction
from math import lcm
from typing import Callable, Optional

from .. import config
from ..schemas import ERROR_LABELS, LEVEL_LABELS, Lesson, Step
from . import fractions as F
from .grok import GrokError, text_json

log = logging.getLogger("lessons")
Fr = tuple[int, int]

# ---------- atajos de ops ----------
def W(text, x, y, size=42, color=None, anchor=None):
    o = {"op": "write", "text": str(text), "x": x, "y": y, "size": size}
    if color: o["color"] = color
    if anchor: o["anchor"] = anchor
    return o


def FR(n, d, x, y, size=44, color=None):
    o = {"op": "frac", "num": str(n), "den": str(d), "x": x, "y": y, "size": size}
    if color: o["color"] = color
    return o


def PIE(cx, cy, r, parts, shade, color="naranja"):
    return {"op": "pie", "cx": cx, "cy": cy, "r": r, "parts": int(parts), "shade": int(max(0, min(shade, parts))), "color": color}


def BAR(x, y, w, h, parts, shade, color="azul"):
    return {"op": "bar", "x": x, "y": y, "w": w, "h": h, "parts": int(parts), "shade": int(max(0, min(shade, parts))), "color": color}


def CIRCLE(cx, cy, rx, ry=None, color="rojo"):
    return {"op": "circle", "cx": cx, "cy": cy, "rx": rx, "ry": ry or rx, "color": color}


def ARROW(x1, y1, x2, y2, color="rojo"):
    return {"op": "arrow", "x1": x1, "y1": y1, "x2": x2, "y2": y2, "color": color}


def CROSS(x, y, w, h, color="rojo"):
    return {"op": "cross", "x": x, "y": y, "w": w, "h": h, "color": color}


CLEAR = {"op": "clear"}


def equation(a: Fr, b: Fr, res: Optional[Fr], y=100, x0=110, size=46, res_color="rojo", circle: Optional[str] = "rojo",
             colors=(None, None)):
    """a + b = res, con la respuesta encerrada en un círculo."""
    ops = [FR(a[0], a[1], x0, y, size, colors[0]), W("+", x0 + 62, y + 16, size + 6, anchor="middle"),
           FR(b[0], b[1], x0 + 124, y, size, colors[1]), W("=", x0 + 186, y + 16, size + 6, anchor="middle")]
    rx = x0 + 268
    if res:
        ops.append(FR(res[0], res[1], rx, y, size, res_color))
        if circle:
            ops.append(CIRCLE(rx, y, size, size * 1.35, circle))
    else:
        ops.append(W("?", rx, y + 16, size + 8, res_color, "middle"))
    return ops


def bar_group(x, y, w, h, n, d, color):
    """Barra(s) para n/d; si pasa de un entero, dos barras de media anchura."""
    if n <= d:
        return [BAR(x, y, w, h, d, n, color)]
    hw = (w - 12) // 2
    return [BAR(x, y, hw, h, d, d, color), BAR(x + hw + 12, y, hw, h, d, n - d, color)]


# ---------- números de la lección ----------
class N:
    def __init__(self, a: Fr, b: Fr, wrong: Optional[Fr] = None):
        self.a, self.b, self.wrong = a, b, wrong
        self.L = lcm(a[1], b[1])
        self.ka, self.kb = self.L // a[1], self.L // b[1]
        self.ra, self.rb = a[0] * self.ka, b[0] * self.kb
        self.s = self.ra + self.rb
        r = Fraction(self.s, self.L)
        self.simp = (r.numerator, r.denominator)
        self.A, self.B = F.frac_words(*a), F.frac_words(*b)
        self.Wr = F.frac_words(*wrong) if wrong else ""

    def w(self, n, d):
        return F.frac_words(n, d)


def pieces(d: int) -> str:
    p = F.pieces_word(d)
    return p if not p.startswith("sobre") else f"pedazos de {d}"


def turn_step(question: str, line1: str, line2: str, x=620, y=490) -> Step:
    return Step(say=f"Tu turno. {question}", draw=[W(line1, x, y, 34, "azul"), W(line2, x, y + 46, 34, "azul")])


# ---------- constructores por error ----------
def lesson_suma_directa(n: N) -> list[Step]:
    a, b, wr = n.a, n.b, n.wrong or (n.a[0] + n.b[0], n.a[1] + n.b[1])
    big = n.A if Fraction(*a) >= Fraction(*b) else n.B
    same = Fraction(*wr) in (Fraction(*a), Fraction(*b))
    steps = [
        Step(say=f"Sumaste {n.A} más {n.B} y te dio {F.frac_words(*wr)}. Es de los errores más comunes; veamos por qué no puede ser.",
             draw=equation(a, b, wr)),
        Step(say=f"Esta tortilla está partida en {F.num_word(a[1])} pedazos iguales y pinto {F.num_word(a[0])}: eso es {n.A}.",
             draw=[PIE(170, 320, 80, a[1], a[0], "azul"), FR(a[0], a[1], 170, 460, 40, "azul")]),
        Step(say=f"Esta otra está partida en {F.num_word(b[1])} y pinto {F.num_word(b[0])}: eso es {n.B}.",
             draw=[W("+", 300, 336, 56, anchor="middle"), PIE(430, 320, 80, b[1], b[0], "verde"), FR(b[0], b[1], 430, 460, 40, "verde")]),
        Step(say=(f"Y esto es {F.frac_words(*wr)}: ¡lo mismo que una sola de las dos, como si no hubieras sumado nada!" if same else
                  f"Y esto es {F.frac_words(*wr)}. Fíjate: es más chiquito que {big}, ¡y eso que le sumamos algo! Sumar no puede darte menos."),
             draw=[W("=", 560, 336, 56, anchor="middle"), PIE(690, 320, 80, wr[1], min(wr[0], wr[1]), "rojo"),
                   FR(wr[0], wr[1], 690, 460, 40, "rojo"), CROSS(600, 230, 180, 180)]),
        Step(say=f"El problema es que son pedazos de distinto tamaño. Primero hay que partir todo en pedazos iguales: en {pieces(n.L)}.",
             draw=[CLEAR, W(f"Pedazos iguales: {pieces(n.L)}", 60, 80, 44),
                   BAR(80, 140, 480, 56, n.L, n.ra, "azul"), FR(a[0], a[1], 640, 168, 40, "azul"),
                   W("=", 700, 184, 48, anchor="middle"), FR(n.ra, n.L, 770, 168, 40, "azul"),
                   BAR(80, 240, 480, 56, n.L, n.rb, "verde"), FR(b[0], b[1], 640, 268, 40, "verde"),
                   W("=", 700, 284, 48, anchor="middle"), FR(n.rb, n.L, 770, 268, 40, "verde")]),
        Step(say=f"Ahora sí: {n.w(n.ra, n.L)} más {n.w(n.rb, n.L)} son {n.w(n.s, n.L)}. El de abajo no se suma: solo dice de qué tamaño es el pedazo.",
             draw=bar_group(80, 340, 480, 56, n.s, n.L, "morado") + equation((n.ra, n.L), (n.rb, n.L), (n.s, n.L), y=500, x0=120, size=42,
                                                                            res_color="verde", circle="verde")),
        turn_step(f"Explícame con tus palabras por qué {n.A} más {n.B} no puede ser {F.frac_words(*wr)}.",
                  "¿Por qué no", f"es {wr[0]}/{wr[1]}? Explícalo"),
    ]
    return steps


def lesson_numerador_sin_ajustar(n: N) -> list[Step]:
    a, b = n.a, n.b
    wr = n.wrong or (a[0] + b[0], n.L)
    c = wr[1] if wr[1] % a[1] == 0 and wr[1] % b[1] == 0 else n.L
    ka, kb = c // a[1], c // b[1]
    ra, rb, s = a[0] * ka, b[0] * kb, a[0] * ka + b[0] * kb
    pz = lambda k: "pedazo" if k == 1 else "pedazos"
    return [
        Step(say=f"Vas bien: te diste cuenta de que hacían falta pedazos iguales. Pero escribiste {F.frac_words(*wr)}, y ahí está el detalle.",
             draw=equation(a, b, wr)),
        Step(say=f"{n.A.capitalize()} es esta parte de la barra. Si la parto en {F.num_word(c)} pedazos, esa misma parte ya no es {F.num_word(a[0])} {pz(a[0])}: son {F.num_word(ra)}.",
             draw=[BAR(80, 200, 480, 56, a[1], a[0], "azul"), FR(a[0], a[1], 640, 228, 40, "azul"),
                   BAR(80, 290, 480, 56, c, ra, "azul"), FR(ra, c, 640, 318, 40, "azul"),
                   ARROW(80 + 480 * a[0] // a[1], 262, 80 + 480 * a[0] // a[1], 284)]),
        Step(say="Es como cambiar un billete por monedas: no te dan una moneda, te dan varias. Lo que multiplicas abajo, lo multiplicas arriba.",
             draw=[FR(f"{a[0]}×{ka}", f"{a[1]}×{ka}", 150, 450, 40, "azul"), W("=", 240, 466, 48, anchor="middle"), FR(ra, c, 310, 450, 40, "azul"),
                   FR(f"{b[0]}×{kb}", f"{b[1]}×{kb}", 520, 450, 40, "verde"), W("=", 610, 466, 48, anchor="middle"), FR(rb, c, 680, 450, 40, "verde")]),
        Step(say=f"Ahora sí: {F.frac_words(ra, c)} más {F.frac_words(rb, c)} son {F.frac_words(s, c)}.",
             draw=[CLEAR] + equation((ra, c), (rb, c), (s, c), y=140, x0=160, size=50, res_color="verde", circle="verde")
                  + bar_group(80, 280, 480, 56, s, c, "morado")),
        turn_step(f"Si cambio {pieces(a[1])} por {pieces(c)}, ¿por qué el {F.num_word(a[0])} de arriba se vuelve {F.num_word(ra)}?",
                  f"¿Por qué {a[0]}/{a[1]} = {ra}/{c}?", "Explícalo", x=80, y=460),
    ]


def lesson_suma_denominadores(n: N) -> list[Step]:
    a, b = n.a, n.b
    wr = n.wrong or (n.s, 2 * n.L)
    c = wr[1] // 2 if wr[1] % 2 == 0 and (wr[1] // 2) % a[1] == 0 and (wr[1] // 2) % b[1] == 0 else n.L
    ra, rb = a[0] * c // a[1], b[0] * c // b[1]
    s = ra + rb
    return [
        Step(say=f"¡La primera parte la hiciste muy bien! Convertiste a {pieces(c)}. Pero al sumar, también sumaste los de abajo y te dio {F.frac_words(*wr)}.",
             draw=equation((ra, c), (rb, c), wr)),
        Step(say=f"Mira: {F.frac_words(ra, c)} son estos pedazos, y {F.frac_words(rb, c)} son estos otros. Todos son {pieces(c)}, del mismo tamaño.",
             draw=[BAR(80, 200, 480, 56, c, ra, "azul"), FR(ra, c, 640, 228, 40, "azul"),
                   BAR(80, 290, 480, 56, c, rb, "verde"), FR(rb, c, 640, 318, 40, "verde")]),
        Step(say=f"Si los junto, sigo teniendo {pieces(c)}: el tamaño del pedazo no cambia. Por eso el de abajo se queda en {F.num_word(c)}.",
             draw=bar_group(80, 380, 480, 56, s, c, "morado") + [FR(s, c, 640, 408, 40, "verde"), CIRCLE(640, 408, 40, 54, "verde")]),
        Step(say=f"En cambio, {F.frac_words(*wr)} serían pedazos mucho más chiquitos, como partir la tortilla en {F.num_word(wr[1])}.",
             draw=[PIE(850, 250, 85, wr[1], min(wr[0], wr[1]), "rojo"), FR(wr[0], wr[1], 850, 400, 40, "rojo"), CROSS(770, 165, 160, 170)]),
        turn_step(f"Explícame por qué, cuando sumas {pieces(c)} con {pieces(c)}, el resultado sigue siendo {pieces(c)}.",
                  "¿Por qué el de abajo", "no se suma?", x=620, y=500),
    ]


def lesson_general(n: N) -> list[Step]:
    """Receta completa paso a paso. Sirve para cualquier error y para el nivel SUMA."""
    a, b = n.a, n.b
    first = (Step(say=f"Revisemos juntos {n.A} más {n.B}. Tu respuesta fue {n.Wr}; vamos paso a paso para ver dónde se torció.",
                  draw=equation(a, b, n.wrong)) if n.wrong else
             Step(say=f"Vamos a sumar {n.A} más {n.B}, paso a paso.", draw=equation(a, b, None, res_color="azul")))
    return [
        first,
        Step(say="Primero veámoslas: dos tortillas partidas en pedazos de distinto tamaño. Así todavía no se pueden juntar.",
             draw=[PIE(200, 330, 85, a[1], a[0], "azul"), FR(a[0], a[1], 200, 475, 40, "azul"),
                   W("+", 345, 346, 56, anchor="middle"), PIE(490, 330, 85, b[1], b[0], "verde"), FR(b[0], b[1], 490, 475, 40, "verde")]),
        Step(say=f"Paso uno: buscamos en cuántos pedazos partir para que sirva para las dos. {F.num_word(a[1]).capitalize()} y {F.num_word(b[1])} caben exactos en {F.num_word(n.L)}.",
             draw=[CLEAR, W(f"1. Pedazos iguales: {n.L}", 60, 90, 44), W(f"{a[1]} × {n.ka} = {n.L}", 100, 160, 38, "azul"),
                   W(f"{b[1]} × {n.kb} = {n.L}", 100, 215, 38, "verde")]),
        Step(say=f"Paso dos: lo que multiplicas abajo, lo multiplicas arriba. {n.A.capitalize()} se vuelve {n.w(n.ra, n.L)}, y {n.B} se vuelve {n.w(n.rb, n.L)}.",
             draw=[W("2. Arriba también", 60, 300, 44),
                   FR(f"{a[0]}×{n.ka}", f"{a[1]}×{n.ka}", 150, 380, 38, "azul"), W("=", 235, 394, 44, anchor="middle"), FR(n.ra, n.L, 300, 380, 38, "azul"),
                   FR(f"{b[0]}×{n.kb}", f"{b[1]}×{n.kb}", 470, 380, 38, "verde"), W("=", 555, 394, 44, anchor="middle"), FR(n.rb, n.L, 620, 380, 38, "verde")]),
        Step(say=f"Paso tres: sumamos solo los de arriba. {n.w(n.ra, n.L).capitalize()} más {n.w(n.rb, n.L)} son {n.w(n.s, n.L)}.",
             draw=[W("3. Sumo arriba", 60, 500, 44)] + equation((n.ra, n.L), (n.rb, n.L), (n.s, n.L), y=520, x0=420, size=40,
                                                                 res_color="verde", circle="verde")
                  + [PIE(870, 230, 90, n.L, min(n.s, n.L), "morado")]),
        Step(say="Tu turno. Explícame con tus palabras los tres pasos: pedazos iguales, ajustar arriba y sumar.",
             draw=[W("¡Tu turno!", 790, 400, 40, "azul")]),
    ]


# ---------- lecciones por nivel ("No sé nada, explícame") ----------
def level_concepto() -> list[Step]:
    return [
        Step(say="Una fracción dice dos cosas: en cuántos pedazos iguales partes algo, y cuántos de esos pedazos tomas.",
             draw=[PIE(250, 290, 120, 4, 3, "naranja"), FR(3, 4, 560, 290, 80, "azul")]),
        Step(say="El número de abajo dice en cuántos pedazos partí la tortilla: en cuatro. Por eso se llaman cuartos.",
             draw=[ARROW(700, 360, 610, 335, "verde"), W("en cuántos parto", 710, 375, 34, "verde")]),
        Step(say="El de arriba dice cuántos pedazos tomo: tres. Tres cuartos.",
             draw=[ARROW(700, 215, 610, 245, "rojo"), W("cuántos tomo", 710, 215, 34, "rojo")]),
        Step(say="Ojo: los pedazos siempre tienen que ser del mismo tamaño. Si no, no es una fracción justa.",
             draw=[W("¡Pedazos iguales!", 120, 520, 44, "morado")]),
        Step(say="Tu turno. Dime con tus palabras qué significa el número de abajo de una fracción.", draw=[]),
    ]


def level_equivalencia() -> list[Step]:
    return [
        Step(say="Mira esta barra: la parto en dos y pinto una. Es un medio.",
             draw=[BAR(80, 100, 480, 56, 2, 1, "azul"), FR(1, 2, 640, 128, 40, "azul")]),
        Step(say="Ahora la misma barra partida en cuatro: pinto dos. ¡Es exactamente lo mismo! Dos cuartos es igual a un medio.",
             draw=[BAR(80, 200, 480, 56, 4, 2, "verde"), FR(2, 4, 640, 228, 40, "verde"), W("=", 700, 244, 48, anchor="middle"), FR(1, 2, 760, 228, 40, "azul")]),
        Step(say="Y en seis, tres. Partir en más pedazos no cambia cuánto tienes; solo cambia el tamaño de los pedazos.",
             draw=[BAR(80, 300, 480, 56, 6, 3, "morado"), FR(3, 6, 640, 328, 40, "morado")]),
        Step(say="El truco: lo que multiplicas abajo, lo multiplicas arriba. Uno por tres, dos por tres: tres sextos.",
             draw=[FR("1×3", "2×3", 200, 470, 44, "azul"), W("=", 300, 486, 50, anchor="middle"), FR(3, 6, 370, 470, 44, "morado")]),
        Step(say="Tu turno. Explícame por qué un medio y tres sextos son lo mismo.", draw=[]),
    ]


def level_denominador_comun() -> list[Step]:
    return [
        Step(say="Sumar fracciones es fácil cuando los pedazos son del mismo tamaño. Un quinto más dos quintos…",
             draw=equation((1, 5), (2, 5), None, res_color="azul") + [BAR(80, 200, 480, 56, 5, 1, "azul"), BAR(80, 290, 480, 56, 5, 2, "verde")]),
        Step(say="…son tres quintos. Los de abajo no se suman: siguen siendo quintos, porque el tamaño del pedazo no cambió.",
             draw=[BAR(80, 380, 480, 56, 5, 3, "morado"), FR(3, 5, 640, 408, 44, "verde"), CIRCLE(640, 408, 44, 58, "verde")]),
        Step(say="El problema llega cuando los pedazos son de distinto tamaño, como medios y tercios. Primero hay que igualarlos.",
             draw=[CLEAR, PIE(220, 300, 90, 2, 1, "azul"), W("+", 360, 316, 56, anchor="middle"), PIE(500, 300, 90, 3, 1, "verde"),
                   W("¿?", 680, 320, 60, "rojo")]),
        Step(say="Tu turno. Explícame por qué al sumar quintos con quintos, el resultado sigue siendo quintos.", draw=[]),
    ]


# ---------- registro ----------
BUILDERS: dict[str, Callable[[N], list[Step]]] = {
    "SUMA_DIRECTA": lesson_suma_directa,
    "NUMERADOR_SIN_AJUSTAR": lesson_numerador_sin_ajustar,
    "SUMA_DENOMINADORES": lesson_suma_denominadores,
}
TITLES = {
    "SUMA_DIRECTA": "¿Por qué {a} + {b} no es {w}?",
    "NUMERADOR_SIN_AJUSTAR": "Si cambia el de abajo, cambia el de arriba",
    "SUMA_DENOMINADORES": "El de abajo no se suma",
}
CANONICAL_WRONG: dict[str, Optional[Fr]] = {
    "SUMA_DIRECTA": (2, 5), "NUMERADOR_SIN_AJUSTAR": (2, 6), "SUMA_DENOMINADORES": (5, 12), "MULTIPLICA": (1, 6),
    "AMPLIFICACION_INCORRECTA": (4, 6), "ERROR_ARITMETICO": (6, 6), "DENOMINADOR_NO_COMUN": (2, 5), "OTRO": None,
}


def build_for_error(code: Optional[str], a: Fr, b: Fr, wrong: Optional[Fr], lesson_id: str) -> Lesson:
    n = N(a, b, wrong)
    builder = BUILDERS.get(code or "", lesson_general)
    steps = builder(n)
    title = TITLES.get(code or "", "Sumemos {a} + {b} paso a paso").format(
        a=f"{a[0]}/{a[1]}", b=f"{b[0]}/{b[1]}", w=f"{wrong[0]}/{wrong[1]}" if wrong else "?")
    lesson = Lesson(id=lesson_id, title=title, error_code=code, level=None, steps=steps)
    return lesson


LEVEL_BUILDERS = {
    "CONCEPTO_FRACCION": level_concepto,
    "EQUIVALENCIA": level_equivalencia,
    "DENOMINADOR_COMUN": level_denominador_comun,
}


def build_level(level: str) -> Lesson:
    if level == "SUMA":
        steps = lesson_general(N((1, 2), (1, 3)))
    else:
        steps = LEVEL_BUILDERS[level]()
    return Lesson(id=f"level:{level}", title=LEVEL_LABELS[level], error_code=None, level=level, steps=steps)


def lesson_by_id(lesson_id: str) -> Optional[Lesson]:
    kind, _, key = lesson_id.partition(":")
    if kind == "error" and key in ERROR_LABELS:
        return build_for_error(key, (1, 2), (1, 3), CANONICAL_WRONG.get(key), lesson_id)
    if kind == "level" and key in LEVEL_LABELS:
        return build_level(key)
    return None


# ---------- aclaraciones (el alumno interrumpió) ----------
BOARD_SPEC = """Pizarra 1000x600 (x a la derecha, y hacia abajo). Ops de "draw":
- {"op":"write","text":"...","x":60,"y":150,"size":40,"color":"azul","anchor":"start"}  (x,y = línea base; ~18 px por carácter a tamaño 40)
- {"op":"frac","num":"1","den":"2","x":150,"y":250,"size":44,"color":"verde"}  (x,y = centro de la rayita)
- {"op":"pie","cx":200,"cy":330,"r":85,"parts":4,"shade":1,"color":"naranja"}  (tortilla partida en rebanadas)
- {"op":"bar","x":80,"y":200,"w":420,"h":56,"parts":3,"shade":1,"color":"azul"}  (barra partida)
- {"op":"arrow","x1":0,"y1":0,"x2":100,"y2":0,"color":"rojo"} · {"op":"circle","cx":100,"cy":100,"rx":50,"ry":60,"color":"rojo"}
- {"op":"cross","x":0,"y":0,"w":100,"h":100} · {"op":"underline","x":60,"y":160,"w":200} · {"op":"wait","ms":500}
Colores: negro, azul, rojo, verde, morado, naranja. Deja libre la franja superior (y < 80). No encimes cosas. Escribe poco: la voz explica."""

ASK_SYSTEM = f"""Eres una maestra guatemalteca de matemática de 1ro básico explicando en una pizarra mientras hablas.
El alumno te interrumpió porque no entendió algo. Respondes en una hoja aparte, usando OTRA representación distinta a la de la clase
(si usabas barras, usa tortillas; o usa dinero en quetzales; o una recta numérica). De tú, cálida, clara, con ejemplos de Guatemala.
1 a 3 pasos. Cada "say" máximo 30 palabras. El último "say" termina con algo como "¿Ahora sí? Sigamos con la clase."
{BOARD_SPEC}
Responde SOLO JSON: {{"steps":[{{"say":"...","draw":[...]}}]}}"""


def ask(lesson: Optional[Lesson], step_index: int, question: str) -> list[Step]:
    ctx_say = ""
    if lesson and lesson.steps:
        ctx_say = lesson.steps[max(0, min(step_index, len(lesson.steps) - 1))].say
    if config.has_ai():
        try:
            data = text_json(ASK_SYSTEM, f"Clase: {lesson.title if lesson else ''}\nLo que estabas explicando: {ctx_say}\n"
                                         f"Duda del alumno: {question}")
            steps = [Step(**s) for s in data.get("steps", [])][:3]
            if steps:
                return steps
        except (GrokError, Exception) as e:  # noqa: BLE001
            log.warning("ask cayó a respaldo: %s", e)
    return fallback_ask(question)


def fallback_ask(question: str) -> list[Step]:
    q = (question or "").strip()
    return [
        Step(say="Buena pregunta. Pensémoslo con tortillas: si una está partida en dos y otra en tres, los pedazos no son del mismo tamaño.",
             draw=[PIE(230, 300, 100, 2, 1, "azul"), PIE(560, 300, 100, 3, 1, "verde"), W("¿mismo tamaño?", 330, 480, 40, "rojo")]),
        Step(say="Por eso primero las partimos igual, en pedacitos que sirvan para las dos. ¿Ahora sí? Sigamos con la clase.",
             draw=[PIE(850, 300, 100, 6, 5, "morado")]),
    ] if q else []


# ---------- "explícamelo con tus palabras" ----------
KEYWORDS = ("tamaño", "igual", "mismo", "pedazo", "denominador", "abajo", "multiplic", "comun", "común")


def explain_back(lesson: Optional[Lesson], transcript: str) -> tuple[str, bool]:
    t = (transcript or "").strip()
    if not t:
        return "No te escuché bien. ¿Me lo cuentas otra vez?", False
    if config.has_ai():
        try:
            data = text_json(
                "Eres una maestra de 1ro básico. Evalúa si la explicación del alumno capta la idea clave de la clase. "
                "Responde SOLO JSON: {\"understood\": true/false, \"feedback\": \"una frase cálida, de tú, máximo 20 palabras\"}",
                f"Clase: {lesson.title if lesson else ''}\nExplicación del alumno: {t}")
            return str(data.get("feedback", "")).strip() or "¡Gracias por explicarlo!", bool(data.get("understood"))
        except Exception as e:  # noqa: BLE001
            log.warning("explain_back cayó a respaldo: %s", e)
    ok = any(k in t.lower() for k in KEYWORDS)
    return ("¡Eso es! Lo explicaste con tus palabras." if ok else
            "Vas cerca. Piensa en el tamaño de los pedazos y vuelve a intentarlo."), ok
