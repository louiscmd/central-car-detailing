import subprocess

opening = "Trafiłem na wasze social media i muszę przyznać że wasze danie wyglądają naprawde przepysznie! Jednak zauważyłem też, że restauracja nie wykorzystuje w pełni potencjału social mediów. "
closing = "\n\nJestem młodym social media managerem i chciałbym wam pomóc w ulepszeniu waszych socjali. Pomogłem już jednemu z moich klientów zwiększyć zasięgi z 300 wyświetleń w ciągu dwóch miesięcy do 30 000 wyświetleń w 60 dni bez żadnych płatnych reklam. Jeśli to Państwa ciekawi, chętnie wyślę parę przykładów mojej pracy aby dać Państwu lepszą perspektywę."

def dm(body, fb):
    link = (fb + "\n\n") if fb else ""
    return link + opening + body + closing

leads = [
    # ══════════════════════════════════
    # LEADS WITH FACEBOOK (35)
    # ══════════════════════════════════
    {
        "name": "LAB Specialty Coffee",
        "fb": "https://www.facebook.com/61566019224546/",
        "body": "Na instagramie profil rzadko pokazuje sam proces parzenia kawy i pracę baristów co jest naturalnie angażującą treścią dla miejsca które łączy palnię z kawiarnią. Posty pojawiają się też nieregularnie co hamuje widoczność w algorytmie.",
    },
    {
        "name": "Mon Nom Bakery",
        "fb": "https://www.facebook.com/p/Mon-Nom-Bakery-61574585655898/",
        "body": "Na instagramie treści skupiają się wyłącznie na gotowych wyrobach bez pokazania procesu wypieku który byłby wyjątkowo angażującą treścią dla piekarni. Brakuje też Stories Highlights z ofertą dnia czy godzinami otwarcia.",
    },
    {
        "name": "Namo Bakery",
        "fb": "https://www.facebook.com/p/Namo-Bakery-100066509095382/",
        "body": "Na instagramie przy blisko 10 tysiącach obserwujących brakuje Reelsów pokazujących wegańskie wypieki w procesie tworzenia co jest dziś najpopularniejszym formatem wśród piekarni. Posty skupiają się głównie na gotowych produktach bez żadnego pokazania kuchni.",
    },
    {
        "name": "Fourteen Concept Cafe",
        "fb": "https://www.facebook.com/FOURTEENConcept/",
        "body": "Na instagramie profil ma zaledwie kilkadziesiąt postów bez żadnej regularności i brakuje treści które połączyłyby kawę z konceptem pielęgnacji skóry w angażujący sposób. Brakuje Reelsów mimo że unikalne połączenie kawy i kosmetyków byłoby naturalnie wiralowym contentem.",
    },
    {
        "name": "Galop Bistro",
        "fb": "https://www.facebook.com/p/Galop-restaurant-61581795921176/",
        "body": "Na instagramie profil dopiero startuje i nie ma jeszcze żadnej spójnej strategii co w pierwszych tygodniach działalności może bardzo utrudnić zbudowanie stałego grona obserwujących. Brakuje Reelsów pokazujących wnętrze i menu restauracji które byłyby naturalnym punktem startowym.",
    },
    {
        "name": "Rumory Bistro",
        "fb": "https://www.facebook.com/rumory.bistro/",
        "body": "Na instagramie mimo ponad 6 tysięcy obserwujących Reelsy pojawiają się rzadko co sprawia że profil nie wykorzystuje wyjątkowej lokalizacji w Muzeum Sztuki Nowoczesnej do generowania nowych zasięgów. Treści nie pokazują też widoków i klimatu miejsca które byłyby naturalnie angażującym contentem.",
    },
    {
        "name": "Kawałek Specialty Coffee",
        "fb": "https://www.facebook.com/KawiarniaKawalek/",
        "body": "Na instagramie przy zaledwie 2420 obserwujących kawiarnia specialty działająca od lat powinna mieć wielokrotnie większą społeczność. Brakuje Reelsów z procesu alternatywnego parzenia kawy które przyciągają dziś ogromne zasięgi w niszy specialty.",
    },
    {
        "name": "Dobra Materia",
        "fb": "https://www.facebook.com/kawiarniadobramateria/",
        "body": "Na instagramie profil nie korzysta z Reelsów mimo że cuppingi i degustacje kaw byłyby naturalnie wyjątkowym contentem wyróżniającym kawiarnię spośród innych miejsc w Warszawie. Posty pojawiają się też nieregularnie co ogranicza widoczność dla nowych odbiorców.",
    },
    {
        "name": "Być Może",
        "fb": "https://www.facebook.com/bycmozewarszawa/",
        "body": "Na instagramie mimo kilku lat działalności i świetnej lokalizacji na Placu Grzybowskim profil nie korzysta aktywnie z Reelsów które mogłyby pokazać codzienne wypieki i klimat piekarni. Brakuje też spójnej narracji wizualnej między różnymi lokalizacjami.",
    },
    {
        "name": "Park Cafe Mokotów",
        "fb": "https://www.facebook.com/ParkCafeMokotow/",
        "body": "Na instagramie profil jest bardzo nowy i nie ma jeszcze żadnej strategii contentowej co w pierwszych miesiącach działalności jest straconą szansą na budowanie organicznej społeczności. Brakuje Reelsów pokazujących taras i polsko-śródziemnomorskie menu.",
    },
    {
        "name": "Alina Cafe Bar",
        "fb": "https://www.facebook.com/61558969329217/",
        "body": "Na instagramie unikalny kontekst galerii Zachęty i artystycznego otoczenia nie jest w ogóle wykorzystywany do budowania wyróżniającej się narracji wizualnej. Brakuje Reelsów które mogłyby pokazać jak atmosfera miejsca łączy sztukę z domową kuchnią polską.",
    },
    {
        "name": "Retros Grill & Wino",
        "fb": "https://www.facebook.com/p/Retros-Grill-i-Wino-61566839789642/",
        "body": "Na instagramie profil dopiero startuje z bardzo małą liczbą obserwujących i nie ma jeszcze żadnej strategii która pomagałaby budować rozpoznawalność na Ochocie. Brakuje Reelsów pokazujących grill i atmosferę restauracji.",
    },
    {
        "name": "HOOD",
        "fb": "https://www.facebook.com/p/HOODWarsaw-61574392262845/",
        "body": "Na instagramie kawiarnia i bar z muzyką nie używa Reelsów do pokazania muzycznych wieczorów ani porannych śniadań co jest dużą straconą szansą dla miejsca które łączy kawę z kulturą. Posty pojawiają się też bez żadnej regularności.",
    },
    {
        "name": "Epicurien Bistro & Deli",
        "fb": "https://www.facebook.com/p/Epicurien-bistro-deli-61567099745199/",
        "body": "Na instagramie profil nie pokazuje wyjątkowej przestrzeni dawnej fabryki kosmetyków Pollena która byłaby doskonałym tłem dla angażujących filmów. Brakuje też Reelsów z przygotowania deli i śniadań które przyciągają duże zasięgi dla restauracji w podobnym stylu.",
    },
    {
        "name": "Noble Coffee",
        "fb": "https://www.facebook.com/noblecoffeewarszawa/",
        "body": "Na instagramie palarnia kawy nie pokazuje procesu palenia ziaren który jest jednym z najbardziej wiralowych rodzajów contentu w niszy specialty coffee. Posty skupiają się głównie na gotowych napojach bez edukacyjnych treści o origin kawy.",
    },
    {
        "name": "Wandal",
        "fb": "https://www.facebook.com/wandal.www/",
        "body": "Na instagramie przy statusie jednego z najgorętszych otwarć sezonu i wyróżnieniu Bib Gourmand profil nie wykorzystuje tego hype do budowania organicznych zasięgów. Brakuje regularnych Reelsów ze zmieniającego się sezonowego menu które byłyby naturalnym contentem.",
    },
    {
        "name": "Negroni Centrale",
        "fb": "https://www.facebook.com/NegroniCentrale/",
        "body": "Na instagramie przy ponad 8 tysiącach obserwujących zasięg Reelsów jest nieproporcjonalnie niski jak na miejsce z tak charakternym konceptem. Brakuje edukacyjnych treści o włoskich produktach i koktajlach które świetnie sprawdzają się jako angażujący content dla barów.",
    },
    {
        "name": "Monkey Love",
        "fb": "https://www.facebook.com/p/Monkey-Love-Warsaw-61559754997916/",
        "body": "Na instagramie wyjątkowa lokalizacja przy Wiśle i połączenie restauracji z imprezami muzycznymi nie jest wyraźnie komunikowane przez Reelsy. Profil nie buduje spójnego wizerunku który przyciągałby zarówno gości na obiady jak i na nocne wydarzenia.",
    },
    {
        "name": "Spektakulinarna",
        "fb": "https://www.facebook.com/Spektakulinarna/",
        "body": "Na instagramie kawiarnia z tak wyjątkową misją społeczną ma niemal zerowy zasięg mimo że historia tego miejsca jest naturalnie wiralowym contentem. Brakuje filmów które pokazałyby pracę baristas i kelnerów z niepełnosprawnościami co przyciągałoby ogromną uwagę.",
    },
    {
        "name": "Misaki Restaurant",
        "fb": "https://www.facebook.com/p/Misaki-Restaurant-61578418012174/",
        "body": "Na instagramie restauracja fine dining w Elektrowni Powiśle nie publikuje żadnych materiałów wideo które pokazywałyby technikę szefa kuchni i wyjątkowe kompozycje dań. Brakuje Reelsów z procesu przygotowania potraw co jest standardem wśród restauracji tego poziomu.",
    },
    {
        "name": "Córka Basi",
        "fb": "https://www.facebook.com/p/C%C3%B3rka-Basi-61573868373348/",
        "body": "Na instagramie profil jest bardzo nowy z zaledwie kilkudziesięcioma polubeniami i nie ma jeszcze żadnej strategii budowania społeczności. Brakuje Reelsów pokazujących tradycyjne polskie dania w przygotowaniu co byłoby naturalnym pierwszym krokiem.",
    },
    {
        "name": "Sour Deli",
        "fb": "https://www.facebook.com/p/SOUR-Deli-100081334403662/",
        "body": "Na instagramie przy kilkuset obserwujących piekarnia rzemieślnicza z własną cukiernią powinna mieć wielokrotnie więcej fanów online. Brakuje Reelsów pokazujących proces wypieku na zakwasie który jest jednym z najskuteczniejszych formatów w tej niszy.",
    },
    {
        "name": "toMy Kawiarnia",
        "fb": "https://www.facebook.com/toMyKawiarniaWarszawa/",
        "body": "Na instagramie kawiarnia z tak inspirującą historią i społeczną misją nie korzysta z Reelsów które w naturalny sposób przyciągałyby uwagę i nowych gości. Posty pojawiają się nieregularnie co sprawia że wyjątkowy charakter miejsca nie trafia do szerszej publiczności.",
    },
    {
        "name": "Bishops Brew",
        "fb": "https://www.facebook.com/p/bishopsbrew-61558093397249/",
        "body": "Na instagramie unikalne połączenie kawy śródziemnomorskiego jedzenia i szachów nie jest komunikowane w żaden wyróżniający sposób. Brakuje Reelsów które mogłyby zbudować wokół tego miejsca konkretną tożsamość i przyciągnąć stałą społeczność.",
    },
    {
        "name": "Kultura Kawy",
        "fb": "https://www.facebook.com/kulturakawy.kawiarnia/",
        "body": "Na instagramie przy kilku lokalizacjach w Warszawie profil nie ma spójnej strategii contentowej która budowałaby rozpoznawalną markę specialty coffee. Brakuje Reelsów edukacyjnych o kawie mimo że to właśnie ten format najlepiej sprawdza się dla kawiarni specialty.",
    },
    {
        "name": "AHAAN Street",
        "fb": "https://www.facebook.com/ahaanwarszawa/",
        "body": "Na instagramie mimo popularności pierwszej lokalizacji na Saskiej Kępie nowe miejsce na Mokotowie nie jest wystarczająco komunikowane przez Reelsy ani dedykowany content. Profil nie pokazuje przygotowania tajskich dań ulicznych co byłoby naturalnie angażującą treścią.",
    },
    {
        "name": "BAKEN Bar",
        "fb": "https://www.facebook.com/baken.piekarnia/",
        "body": "Na instagramie letni bar w starym warsztacie samochodowym przy Cytadeli nie wykorzystuje tej wyjątkowej przestrzeni do tworzenia klimatycznych filmów. Profil nie ma też strategii contentowej poza sezonem co oznacza że zimą obserwujący zapominają o istnieniu miejsca.",
    },
    {
        "name": "Ale Sztuka",
        "fb": "https://www.facebook.com/p/Ale-Sztuka-61577007084489/",
        "body": "Na instagramie restauracja przy Akademii Sztuk Pięknych nie łączy jedzenia ze sztuką w żaden wyróżniający sposób co jest zmarnowanym potencjałem wyjątkowej lokalizacji. Brakuje Reelsów dokumentujących wystawy i wydarzenia artystyczne które przyciągałyby nowych gości.",
    },
    {
        "name": "Sando Cafe",
        "fb": "https://www.facebook.com/SandoCafe/",
        "body": "Na instagramie kawiarnia specjalizująca się w matchy nie publikuje Reelsów pokazujących unikalny format przejrzystych kubków z opisem co jest doskonałym wizualnym konceptem do wykorzystania w filmach. Posty pojawiają się też nieregularnie co ogranicza zasięg organiczny.",
    },
    {
        "name": "Bull & Rye",
        "fb": "https://www.facebook.com/p/Bull-Rye-61561127864432/",
        "body": "Na instagramie przy zaledwie kilkuset obserwujących bar ze smashburgerami na Saskiej Kępie praktycznie nie istnieje online. Brakuje Reelsów pokazujących proces smashowania burgerów który jest jednym z najbardziej angażujących formatów wideo w segmencie burger barów.",
    },
    {
        "name": "Manto Cafe",
        "fb": "https://www.facebook.com/people/Manto-Cafe/61587827425542/",
        "body": "Na instagramie przy 13 tysiącach obserwujących profil nie ma jeszcze równoległej strategii na Facebooku co oznacza że część potencjalnych klientów w starszej grupie demograficznej w ogóle nie trafia do lokalu. Brakuje też spójności między treściami na różnych platformach.",
    },
    {
        "name": "Yuniku Ramen & Sushi",
        "fb": "https://www.facebook.com/YunikuAsian/",
        "body": "Na instagramie restauracja nie pokazuje procesu przygotowania ramen ani techniki sushi co jest standardem wśród japońskich restauracji z zasięgami. Brakuje też spójnej strategii postów co sprawia że profil rośnie bardzo powoli.",
    },
    {
        "name": "Milk Bar Warsaw",
        "fb": "https://www.facebook.com/milkbarwarsaw/",
        "body": "Na instagramie ukraiński koncept kulinarny łączący śniadania z piekarnią nie jest dostatecznie tłumaczony polskiej publiczności co może utrudniać przyciąganie nowych gości. Brakuje Reelsów pokazujących przygotowanie charakterystycznych wypieków i deserów.",
    },
    {
        "name": "Bistro Bielany",
        "fb": "https://www.facebook.com/tobistrobielany/",
        "body": "Na instagramie przy 831 obserwujących i dobrej historii miejsca posty pojawiają się bardzo nieregularnie. Profil nie korzysta z Reelsów mimo że klimatyczna przestrzeń w sercu Starych Bielan byłaby doskonałym tłem dla angażujących filmów.",
    },
    {
        "name": "KARMA.bielany",
        "fb": "https://www.facebook.com/KARMA.bielany/",
        "body": "Na instagramie mimo ponad 6 tysięcy fanów na Facebooku profil nie ma jasnej strategii treści wideo. Brakuje Reelsów które pomogłyby przenieść popularność z Facebooka na nowych odbiorców w młodszej grupie wiekowej.",
    },

    # ══════════════════════════════════
    # INSTAGRAM ONLY (15)
    # ══════════════════════════════════
    {
        "name": "Szczęście Cafe",
        "fb": "",
        "body": "Na instagramie kawiarnia i lodziarnia z naturalnymi lodami nie pokazuje procesu ich przygotowania co byłoby naturalnie wiralowym contentem szczególnie latem. Posty pojawiają się też nieregularnie bez żadnej strategii sezonowej.",
    },
    {
        "name": "QQ Warsaw",
        "fb": "",
        "body": "Na instagramie kawiarnia z matchą i koreańskimi tostami ma bardzo mało postów jak na miejsce z tak trendy ofertą. Brakuje Reelsów pokazujących przygotowanie bulgogi tostu czy matchy co byłoby naturalnie popularnym contentem.",
    },
    {
        "name": "Alaf Meyhane",
        "fb": "",
        "body": "Na instagramie turecka restauracja z meze nie publikuje edukacyjnych treści o tureckich przekąskach i tradycjach kulinarnych które są dziś bardzo popularnym formatem. Brakuje też Reelsów pokazujących klimat meyhane i różnorodność meze.",
    },
    {
        "name": "Wanderlust Specialty Coffee",
        "fb": "",
        "body": "Na instagramie przy zaledwie 1451 obserwujących kawiarnia z tak podróżniczym konceptem i ziarnami z całego świata powinna mieć wielokrotnie większy zasięg. Brakuje Reelsów z procesu parzenia kaw z różnych origin co jest doskonałym formatem dla kawiarni specialty.",
    },
    {
        "name": "U Know Coffeehouse",
        "fb": "",
        "body": "Na instagramie przy 1666 obserwujących miejsce oferujące kawę matchę wino i koktajle nie ma spójnej narracji która wyjaśniałaby tak szeroki koncept nowym odbiorcom. Brakuje Reelsów które pokazywałyby różnorodność oferty przez cały dzień.",
    },
    {
        "name": "Wilcza 43 Bistro & Wine",
        "fb": "",
        "body": "Na instagramie bistro z autorską polską kuchnią i winem nie korzysta z Reelsów do prezentacji sezonowego menu które regularnie się zmienia. Brakuje też spójnej strategii postów dla miejsca które dopiero buduje swoją rozpoznawalność w Śródmieściu.",
    },
    {
        "name": "WIN Wine Bar",
        "fb": "",
        "body": "Na instagramie wine bar i deli ze śniadaniami nie buduje żadnej edukacyjnej narracji o winie mimo że to właśnie ten format treści jest dziś najskuteczniejszy dla wine barów. Brakuje Reelsów prezentujących wybory i storytelling winny.",
    },
    {
        "name": "Brut Restobar",
        "fb": "",
        "body": "Na instagramie przy ponad 7 tysiącach obserwujących Reelsy są rzadkie co sprawia że restauracja nie wykorzystuje efektywnie swojego zasięgu. Wyjątkowe wnętrze z inspiracją brutalizmem i sezonowe menu nie są komunikowane przez angażujący format wideo.",
    },
    {
        "name": "Barbara",
        "fb": "",
        "body": "Na instagramie miejsce działające całą dobę i łączące poranną kawiarnię z nocnym barem nie ma spójnej strategii contentowej która komunikowałaby ten wyjątkowy charakter. Brakuje Reelsów pokazujących transformację miejsca od poranka do późnej nocy.",
    },
    {
        "name": "Koński Ząb Taco",
        "fb": "",
        "body": "Na instagramie taqueria z ręcznie robionymi tortillas z kukurydzianej mąki nie korzysta z Reelsów do pokazania tego procesu który byłby naturalnie wiralowym contentem. Przy 2900 obserwujących profil ma potencjał na szybki wzrost dzięki unikalności konceptu.",
    },
    {
        "name": "Videodrome Cantina Club",
        "fb": "",
        "body": "Na instagramie unikalna kawiarnia i bar w klimacie retro kina nie łączy filmowych inspiracji z contentem kulinarnym w żaden wyróżniający sposób. Brakuje Reelsów które mogłyby bawić się konceptem filmowym i przyciągać zarówno miłośników kina jak i dobrego jedzenia.",
    },
    {
        "name": "KONBINI Coffee & Sando",
        "fb": "",
        "body": "Na instagramie japońska kawiarenka z ręcznie robionymi sando nie pokazuje procesu przygotowania kanapek ani onigiri co byłoby naturalnie angażującym contentem. Posty pojawiają się bez regularności co utrudnia budowanie stałej widowni.",
    },
    {
        "name": "DOT Coffee & Matcha",
        "fb": "",
        "body": "Na instagramie kawiarnia specialty i matcha bar nie korzysta z Reelsów pokazujących kreatywne wariacje matchy które mogłyby stać się wiralowym contentem. Brakuje też spójnej narracji wizualnej która wyróżniałaby profil spośród rosnącej liczby matcha barów w Warszawie.",
    },
    {
        "name": "Moya Matcha",
        "fb": "",
        "body": "Na instagramie ceremonialna matcha jest serwowana bez żadnego storytellingu o tradycji czy procesie przygotowania co jest straconą szansą na edukacyjny content który przyciąga duże zasięgi w tej niszy. Brakuje Reelsów z ceremonii parzenia matcha.",
    },
    {
        "name": "Nami Sushi & Dim Sum",
        "fb": "",
        "body": "Na instagramie restauracja łącząca sushi z dim sum nie pokazuje żadnych filmów z przygotowania ani składania tych dań mimo że format wideo z ręcznym składaniem dim sum jest dziś jednym z najbardziej popularnych w kuchni azjatyckiej. Posty pojawiają się też sporadycznie.",
    },
]

rows = []
for l in leads:
    text = dm(l["body"], l["fb"])
    text_escaped = '"' + text.replace('"', '""') + '"'
    row = "\t".join([l["name"], l["fb"], text_escaped])
    rows.append(row)

tsv = "\n".join(rows)
subprocess.run(["pbcopy"], input=tsv.encode("utf-8"))
print(f"Skopiowano {len(rows)} DMów do schowka.\n")
for i, l in enumerate(leads, 1):
    tag = "[FB]" if l["fb"] else "[IG only]"
    print(f"{i:2}. {tag} {l['name']}")
