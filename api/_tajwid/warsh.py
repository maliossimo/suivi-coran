# Warsh ʿan Nāfiʿ (ṭarīq al-Azraq) for the imam.
# The King Fahd Complex Warsh text already writes most of Warsh in its letters: ibdal (يُومِنُونَ), naql (قَدَ اَفْلَحَ),
# silat mim al-jamʿ (عَلَيْهِمُۥٓ), the second hamza (ءَآنذَرْتَهُمُۥٓ), taqlil / imala (مُوس۪يٰ). It is spelled in the
# Maghribi way, which the phonetizer does not read: to_phonetizer() rewrites the spelling only (hamzat wasl اَ۬ → ٱ,
# ے → ى, vowel-then-shadda → shadda-then-vowel, open tanween on the alif → on the letter…), keeping every Warsh
# feature, so the Hafs phonetizer can turn it into the phonetic script. Warsh's lengths are then set by WARSH_MADD.
import re, unicodedata

FATHA, DAMMA, KASRA, SHADDA, SUKUN = 'َ', 'ُ', 'ِ', 'ّ', 'ْ'
FATHATAN, DAMMATAN, KASRATAN = 'ً', 'ٌ', 'ٍ'
TANWEEN = FATHATAN + DAMMATAN + KASRATAN
TANWEEN_OF = {FATHA: FATHATAN, DAMMA: DAMMATAN, KASRA: KASRATAN}
OPEN_TANWEEN = {'ࣰ': FATHATAN, 'ࣱ': DAMMATAN, 'ࣲ': KASRATAN}
DAGGER, MADDA, TATWEEL, HAMZA_ABOVE, HAMZA_BELOW = 'ٰ', 'ٓ', 'ـ', 'ٔ', 'ٕ'
WASL, ALEF_MAQSURA, YEH_BARREE, ALEF_MADDA = 'ٱ', 'ى', 'ے', 'آ'
SMALL_MEEM = 'ۢ'      # ۢ : iqlab
LOW_MEEM = '\u06ED'  # ۭ : after a tanween in Hafs's text: merged (idgham) or hidden (ikhfa)
IMALA = '۪'           # ۪ : taqlil / imala (below a letter); below a hamzat wasl: a wasl begun with kasra
WASL_MARKS = '۬۟' + IMALA  # ۬ ۟ ۪ : the small marks of a hamzat wasl in this text
SILENT = '۟'          # ۟ : a letter not pronounced (the alif of كَفَرُوا۟ in the Hafs text)
STOP = 'ۖ'            # ۖ : the Maghribi mushaf's one stop mark (waqf al-Habtī), at every place to stop
DROP = dict.fromkeys(map(ord, 'ۖ۞۩‏'))  # stop mark, rubʿ, sajda, RLM
V = FATHA + DAMMA + KASRA

# lengths Warsh (al-Azraq) accepts, by the phonetizer's rule names
WARSH_MADD = {
    'NormalMaddRule': {2}, 'MonfaselMaddRule': {6}, 'MottaselMaddRule': {6}, 'MottaselMaddPauseRule': {6},
    'LazemMaddRule': {6}, 'AaredMaddRule': {2, 4, 6}, 'LeenMaddRule': {2, 4, 6},
    'BadalMadd': {2, 4, 6},  # a madd after a hamza (ءَامَنُوا): qasr, tawassut or tul
}

# verses that open with separate letters (الٓمٓ, طسٓمٓ…): Warsh says them as Hafs does; the phonetizer reads Hafs's spelling
MUQATTAAT = {2, 3, 7, 10, 11, 12, 13, 14, 15, 19, 20, 26, 27, 28, 29, 30, 31, 32, 36, 38, 40, 41, 42, 43, 44, 45, 46, 50, 68}


def to_phonetizer(word: str) -> str:
    """one Warsh word in the spelling the phonetizer reads (Hafs conventions); the sounds stay Warsh's"""
    # NFC puts the marks in canonical order and composes ا + ٕ → إ, ے + ٔ → ۓ; آ goes back to ا + ٓ (the phonetizer's form)
    w = unicodedata.normalize('NFC', word.translate(DROP)).replace(ALEF_MADDA, 'ا' + MADDA)
    # open tanween (ࣰ ࣱ ࣲ: merged / hidden into the next word) → Hafs's text form: tanween + ۭ, which the phonetizer reads
    for o, t in OPEN_TANWEEN.items(): w = w.replace(o, t + LOW_MEEM)
    w = w.replace(FATHA + 'ئ' + SUKUN, FATHA + 'ي' + SUKUN + TATWEEL + HAMZA_ABOVE)  # شَئْاࣰ (شَيْئًا): ي sakin, then the hamza
    w = w.replace('ۓ', 'ئ')                                              # يَسْتَهْزِۓُ → يَسْتَهْزِئُ
    w = re.sub(f'{YEH_BARREE}(?=[^ء-ي]*$)', ALEF_MAQSURA, w)              # ے: final → ى (ٱلَّذِے → ٱلَّذِى) ...
    w = w.replace(YEH_BARREE, 'ي')                                       # ... inside the word → ي (س۬ےٓءَ → سِيٓءَ)
    w = re.sub(f'[يى]([{V}]?)[{HAMZA_ABOVE}{HAMZA_BELOW}]', r'ئ\1', w)    # a hamza on a yāʾ seat: ىِٕ → ئِ
    w = re.sub(f'و([{V}]){HAMZA_BELOW}', r'ؤ\1', w)                      # on a wāw seat: ٱللُّؤْلُوِٕ → ٱللُّؤْلُؤِ
    w = w.replace('أ' + MADDA, 'ءَا')                                    # لِأٓدَمَ → لِءَادَمَ
    w = re.sub(f'([{TANWEEN}{V}])({LOW_MEEM}?)({SHADDA})', r'\3\1\2', w)  # vowel before shadda → shadda, vowel
    w = re.sub(f'{TATWEEL}([{V}]){DAGGER}[{HAMZA_ABOVE}{HAMZA_BELOW}]', TATWEEL + HAMZA_ABOVE + r'\1' + TATWEEL + DAGGER, w)  # ـَٰٔ → ـَٔـٰ
    w = re.sub(f'{TATWEEL}([{V}])[{HAMZA_ABOVE}{HAMZA_BELOW}]', TATWEEL + HAMZA_ABOVE + r'\1', w)  # ـِٕ / ـُٔ → ـٔ + vowel
    w = re.sub(f'([يو])([{V}]){MADDA}{HAMZA_ABOVE}', r'\1' + MADDA + TATWEEL + HAMZA_ABOVE + r'\2', w)  # يَٓٔ → يٓـَٔ
    # tanween with iqlab written vowel + ۢ (صُمُّۢ): → tanween + ۢ (صُمٌّۢ)
    w = re.sub(f'([{V}]){SMALL_MEEM}', lambda m: TANWEEN_OF[m.group(1)] + SMALL_MEEM, w)
    w = re.sub(f'ي(?={DAGGER})', ALEF_MAQSURA, w)                        # يٰ → ىٰ (عَلَيٰ → عَلَىٰ)
    if re.search(f'ي[{IMALA}]?[{MADDA}]?$', w) and not re.search(f'ي[{V}{SUKUN}{SHADDA}{TANWEEN}]', w[-3:]):
        w = re.sub(f'ي(?=[{IMALA}]?[{MADDA}]?$)', ALEF_MAQSURA, w)
    pre = f'^((?:[أاٱ]{FATHA})?(?:[وفبكل][{V}]?){{0,2}})'  # prefixes: the question's أَ, then وَ فَ بِ كَ لِ
    w = re.sub(f'^(أ{FATHA}[وف]{FATHA})ا([{V}])', r'\1أ\2', w)  # أَوَاَمِنَ: the hamza after the question's أَوَ
    w = re.sub(pre + f'ا(?:{DAGGER}{MADDA}?|{MADDA}{DAGGER})', lambda m: m.group(1) + 'ءَا', w)  # اٰمَنَ, اٰتَيْنَا: the hamza + alif of ءَا
    w = re.sub(f'^ا({KASRA})(?=[ىي]$)', 'إ' + r'\1', w)                  # اِے (إِي, «yes»): a hamza, not a wasl
    # hamzat wasl (only at the start of the word, after its prefixes): ا with a small vowel and ۬ / ۟ / ۪; bare before
    # a consonant (بِالله, بِاتِّخَاذِكُمُ); a bare voweled alif = naql (the hamza gave its vowel to the word before)
    w = re.sub(pre + f'ا[{V}]?[{WASL_MARKS}]', lambda m: m.group(1) + WASL, w)
    w = re.sub(pre + 'ا(?=[ء-ي])', lambda m: m.group(1) + WASL, w)
    w = re.sub(f'^ا[{V}](?=.)', WASL, w)
    w = re.sub(f'(ل[{KASRA}{DAMMA}])ا(?=[^{V}{SHADDA}{DAGGER}])', r'\1', w)  # naql into the article: ٱلِانجِيلَ → ٱلِنجِيلَ
    # naql into the article with a fatha: the alif was the hamza's seat (ٱلَارْضِ → ٱلَرْضِ: the next letter has no vowel of
    # its own, or a shadda: ٱلَاوَّلِينَ); before a voweled letter it is the long alif (ٱلَاخِرَةِ: a badal, kept)
    w = re.sub(f'({WASL}ل{FATHA})ا(?=[ء-ي](?:{SUKUN}|{SHADDA}|$|[^{V}{DAGGER}]))', r'\1', w)
    # taqlil / imala (۪): the phonetizer has no sign for it; the letter keeps its fatha (مُوس۪ىٰٓ → مُوسَىٰٓ)
    w = re.sub(f'([ء-ي])({SHADDA}?){FATHA}?{IMALA}', r'\1\2' + FATHA, w)
    w = re.sub(f'([ء-ي])({SHADDA}?){FATHA}?{DAGGER}{IMALA}', r'\1\2' + FATHA + DAGGER, w)
    w = re.sub(f'{ALEF_MAQSURA}{FATHA}{TATWEEL}{DAGGER}', 'ي' + FATHA + DAGGER, w)  # خَطَٰى۪ـٰكُمْ → خَطَٰيَٰكُمْ
    # ۬ left on a letter: tas-hil / ibdal after a vowel (يُوَ۬يِّدُ: the vowel stays), ishmam on a bare letter (س۬يٓءَ → سِيٓءَ)
    w = re.sub(f'([{V}])۬', r'\1', w)
    w = re.sub('([ء-ي])۬', r'\1' + KASRA, w)
    w = re.sub(f'^((?:[وف]{FATHA})?ل{SHADDA}?{KASRA})له', r'\1ل' + SHADDA + FATHA + 'ه', w)  # لِلهِ → لِلَّهِ
    w = re.sub(f'{DAMMA}و{SUKUN}', DAMMA + 'و' + SILENT, w)               # أُوْلَٰٓئِكَ: a wāw not said → أُو۟لَٰٓئِكَ
    w = re.sub(f'ا{SUKUN}', 'ا' + SILENT, w)                              # a silent alif: كَفَرُواْ, مِاْئَةَ: اْ → ا۟
    w = re.sub(f'({DAMMA}و{MADDA}?|{FATHA}و{SUKUN})ا$', r'\1ا' + SILENT, w)        # the plural's alif, unmarked: تَرِثُوا → تَرِثُوا۟
    # the relative pronouns are written with one lam: ٱلذِينَ → ٱلَّذِينَ (ٱلتِى, ٱلذِى)
    w = re.sub(f'{WASL}ل(?=[ذت]{KASRA})', WASL + 'ل' + SHADDA + FATHA, w)
    w = re.sub(f'^((?:[وف]{FATHA})?ل{SHADDA}?{KASRA})ل(?=[ذت]{KASRA})', r'\1ل' + SHADDA + FATHA, w)  # لِّلذِينَ → لِّلَّذِينَ
    # tanween on the seat (خَيْراࣰ, ضَلَٰلاًۢ, هُديࣰ) → on the letter before it, seat after (خَيْرًا, هُدًى)
    w = re.sub(f'[{FATHA}]?ا{FATHATAN}({LOW_MEEM}?{SMALL_MEEM}?)', FATHATAN + r'\1' + 'ا', w)
    w = re.sub(f'[{FATHA}]?[يى]{FATHATAN}({LOW_MEEM}?)$', FATHATAN + r'\1' + ALEF_MAQSURA, w)
    return w


def phrase(words):
    """consecutive Warsh words → the phonetizer's words, with what crosses a word boundary set the Hafs way: a nun
    merged into the next word has no sukun (مَنْ يُّفْسِدُ → مَن يُفْسِدُ), and the yāʾ / wāw it merges into no shadda"""
    ws = [to_phonetizer(w) for w in words]
    for k in range(1, len(ws)):
        a, b = ws[k - 1], ws[k]
        # naql into the article (فِى اِ۬لَارْضِ → «fi-larḍ»): the lam was sakin, the long vowel before it is not said
        if re.match(f'{WASL}ل[{V}]', b):
            ws[k - 1] = a = re.sub(f'([{V}])[اىيو]{DAGGER}?(?:ا{SILENT})?$', r'\1', a)
        if len(b) > 1 and b[1] == SHADDA and re.search(f'ن{SUKUN}$', a):
            ws[k - 1] = a[:-1]
        if len(b) > 1 and b[0] in 'يو' and b[1] == SHADDA and re.search(f'(ن{SUKUN}?|[{TANWEEN}]{LOW_MEEM}?[اى]?)$', ws[k - 1]):
            ws[k] = b[0] + b[2:]
    return ws


def verse(sura: int, aya: int, text: str, hafs_words=None):
    """the phonetizer's text of a Warsh verse; hafs_words (the Hafs Uthmani words) replace the opening letters"""
    ws = phrase([w for w, _ in words(text)])
    if hafs_words and ((aya == 1 and sura in MUQATTAAT) or (sura, aya) == (42, 2)):  # 42:2 = عٓسٓقٓ
        ws[0] = hafs_words[0]
    return ' '.join(ws)


def words(text: str):
    """the Warsh words of a verse (standalone marks left out), and for each: is it followed by a stop mark (ۖ)?"""
    out = []
    for tok in text.split():
        core = tok.translate(DROP)
        if not re.search('[ء-يٱ-ۓ]', core):
            if out and STOP in tok: out[-1] = (out[-1][0], True)
            continue
        out.append((tok, STOP in tok))
    return out
