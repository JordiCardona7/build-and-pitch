"""Reglas deterministas de fracciones: parsear, verificar, clasificar errores y nombrar fracciones en español."""
import re
from fractions import Fraction
from math import gcd, lcm
from typing import Optional

FRAC_RE = re.compile(r"(-?\d+)\s*/\s*(\d+)")


def parse_frac(text: str) -> Optional[tuple[int, int]]:
    """'3/4' → (3, 4); '2' → (2, 1); otra cosa → None."""
    m = re.fullmatch(r"\s*(-?\d+)\s*(?:/\s*(\d+))?\s*", text or "")
    if not m:
        return None
    n, d = int(m.group(1)), int(m.group(2) or 1)
    return (n, d) if d != 0 else None


def find_fracs(text: str) -> list[tuple[int, int]]:
    return [(int(n), int(d)) for n, d in FRAC_RE.findall(text or "") if int(d) != 0]


def parse_exercise(text: str) -> Optional[tuple[tuple[int, int], tuple[int, int]]]:
    """Toma las dos primeras fracciones antes del primer '=' (o del texto completo)."""
    left = (text or "").split("=")[0]
    fr = find_fracs(left)
    if len(fr) < 2:
        fr = find_fracs(text)
    return (fr[0], fr[1]) if len(fr) >= 2 else None


def correct_sum(a: tuple[int, int], b: tuple[int, int]) -> Fraction:
    return Fraction(*a) + Fraction(*b)


def is_correct(a, b, ans: Optional[tuple[int, int]]) -> bool:
    return ans is not None and ans[1] != 0 and Fraction(*ans) == correct_sum(a, b)


def common_multiples(d1: int, d2: int, limit: int = 4) -> list[int]:
    base = lcm(d1, d2)
    return [base * k for k in range(1, limit + 1)] + ([d1 * d2] if d1 * d2 % base else [])


def classify(a: tuple[int, int], b: tuple[int, int], ans: Optional[tuple[int, int]]) -> Optional[str]:
    """Devuelve 'CORRECTO', un código de error inequívoco, o None si la regla no puede decidir (decide la IA)."""
    if ans is None:
        return None
    (an, ad), (bn, bd) = a, b
    n, d = ans
    if d == 0:
        return None
    if is_correct(a, b, ans):
        return "CORRECTO"
    if n == an + bn and d == ad + bd:
        return "SUMA_DIRECTA"
    if Fraction(n, d) == Fraction(an * bn, ad * bd):
        return "MULTIPLICA"
    for c in common_multiples(ad, bd):
        ra, rb = an * c // ad, bn * c // bd
        if d == 2 * c and n == ra + rb:
            return "SUMA_DENOMINADORES"
        if d == c and n == an + bn:
            return "NUMERADOR_SIN_AJUSTAR"
        swapped = an * (c // bd) + bn * (c // ad)        # multiplicó cada numerador por el factor del otro
        if d == c and n == swapped and n != ra + rb:
            return "AMPLIFICACION_INCORRECTA"
        if d == c and abs(n - (ra + rb)) <= 2:
            return "ERROR_ARITMETICO"
    if n == an + bn and d in (ad, bd):
        return "NUMERADOR_SIN_AJUSTAR"
    if d % ad and d % bd and d not in (ad + bd,):
        return "DENOMINADOR_NO_COMUN"
    return None


def simplified(f: Fraction) -> tuple[int, int]:
    return f.numerator, f.denominator


def is_simplified(n: int, d: int) -> bool:
    return gcd(n, d) == 1


# ---------- Nombres en español (para la voz) ----------
_NUM = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
        "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte",
        "veintiún", "veintidós", "veintitrés", "veinticuatro"]
_DEN_SING = {2: "medio", 3: "tercio", 4: "cuarto", 5: "quinto", 6: "sexto", 7: "séptimo", 8: "octavo", 9: "noveno",
             10: "décimo", 11: "onceavo", 12: "doceavo", 13: "treceavo", 14: "catorceavo", 15: "quinceavo",
             16: "dieciseisavo", 18: "dieciochoavo", 20: "veinteavo", 24: "veinticuatroavo"}


def num_word(n: int) -> str:
    return _NUM[n] if 0 <= n < len(_NUM) else str(n)


def den_word(d: int, plural: bool) -> str:
    w = _DEN_SING.get(d)
    if not w:
        return f"sobre {d}"
    return w + ("s" if plural else "")


def frac_words(n: int, d: int) -> str:
    """(1,2) → 'un medio'; (5,6) → 'cinco sextos'; (7,30) → 'siete sobre 30'."""
    if d == 1:
        return num_word(n)
    dw = den_word(d, n != 1)
    if dw.startswith("sobre"):
        return f"{num_word(n)} {dw}"
    return f"{num_word(n)} {dw}"


def pieces_word(d: int) -> str:
    """Plural del tamaño del pedazo: 6 → 'sextos'."""
    return den_word(d, True)
