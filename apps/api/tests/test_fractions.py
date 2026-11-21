from app.services import fractions as F

A, B = (1, 2), (1, 3)


def test_correct_and_equivalent():
    assert F.classify(A, B, (5, 6)) == "CORRECTO"
    assert F.classify(A, B, (10, 12)) == "CORRECTO"


def test_error_patterns():
    assert F.classify(A, B, (2, 5)) == "SUMA_DIRECTA"
    assert F.classify(A, B, (2, 6)) == "NUMERADOR_SIN_AJUSTAR"
    assert F.classify(A, B, (5, 12)) == "SUMA_DENOMINADORES"
    assert F.classify(A, B, (1, 6)) == "MULTIPLICA"
    assert F.classify(A, B, (6, 6)) == "ERROR_ARITMETICO"
    assert F.classify((2, 5), (1, 4), (3, 9)) == "SUMA_DIRECTA"
    assert F.classify((2, 5), (1, 4), (13, 40)) == "SUMA_DENOMINADORES"
    assert F.classify((3, 4), (1, 6), (4, 12)) == "NUMERADOR_SIN_AJUSTAR"


def test_parse_and_words():
    assert F.parse_exercise("1/2 + 1/3 = 3/6 + 2/6 = 5/6") == ((1, 2), (1, 3))
    assert F.frac_words(1, 2) == "un medio"
    assert F.frac_words(5, 6) == "cinco sextos"
    assert F.frac_words(2, 5) == "dos quintos"


def test_first_wrong_line():
    from fractions import Fraction
    r = Fraction(5, 6)
    assert F.first_wrong_line(["1/2 + 1/3", "= 2/5"], r) == 1
    assert F.first_wrong_line(["1/2 + 1/3", "= 1/6 + 1/6", "= 2/6"], r) == 1
    assert F.first_wrong_line(["1/2 + 1/3", "= 3/6 + 2/6", "= 5/12"], r) == 2
    assert F.first_wrong_line(["1/2 + 1/3", "= 3/6 + 2/6", "= 5/6"], r) is None
