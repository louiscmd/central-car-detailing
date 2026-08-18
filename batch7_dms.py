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
        "name": "Jutro Bistro Saska",
        "fb": "https://www.facebook.com/61569094951605/",
        "body": "Na instagramie posty pojawiają się sporadycznie z dużymi przerwami co sprawia że algorytm mocno ogranicza zasięgi. Poza tym profil nie korzysta z Reelsów które dziś generują największy zasięg organiczny.",
    },
    {
        "name": "Dwójka Kielichów",
        "fb": "https://www.facebook.com/p/Dw%C3%B3jka-Kielich%C3%B3w-61558424311493/",
        "body": "Na instagramie treści są jednostajne: prawie wyłącznie zdjęcia wina i talerzy bez żadnego pokazania atmosfery czy historii lokalu. Brakuje też Reelsów które pomogłyby dotrzeć do nowych osób spoza obecnych obserwujących.",
    },
    {
        "name": "Supperlardo",
        "fb": "https://www.facebook.com/Supperlardo/",
        "body": "Na instagramie przerwy między postami są zbyt długie jak na restaurację w centrum Warszawy. Bio nie zawiera też podstawowych informacji jak link do rezerwacji ani godziny otwarcia.",
    },
    {
        "name": "Jeju Korea",
        "fb": "https://www.facebook.com/JejuKoreaWarszawa/",
        "body": "Na instagramie opisy pod zdjęciami są bardzo krótkie lub całkowicie ich brak co sprawia że algorytm nie promuje treści. Profil nie ma też zapiętych Stories Highlights gdzie nowi odwiedzający mogliby od razu zobaczyć menu czy lokalizację.",
    },
    {
        "name": "Halo Mian",
        "fb": "https://www.facebook.com/people/Halo-Mian/61585158965878/",
        "body": "Na instagramie posty nie zawierają żadnego wezwania do działania co sprawia że obserwujący rzadko przekładają je na wizytę. Brakuje też Reelsów pokazujących na przykład przygotowanie makaronu co byłoby naturalnie angażującą treścią.",
    },
    {
        "name": "VIWOK 58",
        "fb": "https://www.facebook.com/viwok58/",
        "body": "Na instagramie profil nie taguje lokalizacji pod postami co oznacza że miejsce nie pojawia się w wynikach dla osób szukających restauracji w tym rejonie. Posty pojawiają się też zbyt nieregularnie żeby budować stały zasięg.",
    },
    {
        "name": "Muszelka",
        "fb": "https://www.facebook.com/p/Muszelka-61559795650210/",
        "body": "Na instagramie przy prawie 8 tysiącach obserwujących zaangażowanie pod postami jest nieproporcjonalnie niskie co wskazuje że treści nie docierają do nowych osób. Brakuje też materiałów wideo które algorytm aktywnie faworyzuje.",
    },
    {
        "name": "Salto Bar",
        "fb": "https://www.facebook.com/p/salto-bar-61559444644153/",
        "body": "Na instagramie mimo ponad 13 tysięcy obserwujących Reelsy pojawiają się bardzo rzadko co sprawia że profil traci dużą część potencjalnego zasięgu organicznego. Opisy pod postami nie zawierają też żadnego CTA zachęcającego do wizyty.",
    },
    {
        "name": "ROST",
        "fb": "https://www.facebook.com/rost.warsaw/",
        "body": "Na instagramie profil skupia się wyłącznie na gotowym produkcie a nie pokazuje procesu palenia kawy który byłby naturalnie angażującą treścią dla miejsca z mikropalnią. Posty pojawiają się też zbyt rzadko jak na lokal z tak ciekawym konceptem.",
    },
    {
        "name": "Baires",
        "fb": "https://www.facebook.com/BairesWarsaw/",
        "body": "Na instagramie przerwy między postami sięgają niekiedy kilku tygodni co mocno hamuje algorytm. Profil nie używa też Reelsów mimo że format krótkich filmów idealnie nadaje się do pokazania grilowania czy atmosfery argentyńskiej restauracji.",
    },
    {
        "name": "Yatta Ramen Postępu",
        "fb": "https://www.facebook.com/YattaRamenPostepu/",
        "body": "Na instagramie profil ma bardzo mało postów jak na restaurację działającą od dłuższego czasu. Brakuje też Stories Highlights gdzie goście mogliby od razu po wejściu na profil zobaczyć menu czy godziny otwarcia.",
    },
    {
        "name": "Dozo Vegan Ramen",
        "fb": "https://www.facebook.com/Dozoveganramen/",
        "body": "Na instagramie posty są publikowane bez hashtagów lub z bardzo ograniczonym ich zestawem co sprawia że treści nie trafiają do osób szukających wegańskiego jedzenia w Warszawie. Brakuje też Reelsów pokazujących proces przygotowania bulionu.",
    },
    {
        "name": "Arigatorii",
        "fb": "https://www.facebook.com/p/Arigatorii-61579459533827/",
        "body": "Na instagramie bio nie zawiera żadnego linku do rezerwacji ani godzin otwarcia co oznacza że zainteresowani goście muszą szukać tych informacji gdzie indziej. Posty pojawiają się też nieregularnie co osłabia widoczność w algorytmie.",
    },
    {
        "name": "Rosalia",
        "fb": "https://www.facebook.com/rosalia.warszawa/",
        "body": "Na instagramie przy 10 tysiącach obserwujących Reelsy są rzadkie co oznacza że profil nie wykorzystuje formatu który daje dziś największy zasięg organiczny. Zaangażowanie pod postami jest też stosunkowo niskie jak na tę liczbę fanów.",
    },
    {
        "name": "Menya Musashi",
        "fb": "https://www.facebook.com/p/Menya-Musashi-Warszawa-100089559437469/",
        "body": "Na instagramie posty pojawiają się sporadycznie bez żadnej regularności co sprawia że profil rośnie bardzo powoli. Opisy są też często wyłącznie po japońsku bez polskiego tłumaczenia co ogranicza zasięg do bardzo wąskiej grupy odbiorców.",
    },
    {
        "name": "Pół na Puł",
        "fb": "https://www.facebook.com/polnapul/",
        "body": "Na instagramie profil pokazuje głównie gotowe dania bez żadnych treści za kulisami czy nagrań atmosfery lokalu. Brakuje też Stories Highlights z menu sezonowym albo przykładami dań do dzielenia które są głównym atutem tego miejsca.",
    },
    {
        "name": "Chałka Bistro",
        "fb": "https://www.facebook.com/p/Cha%C5%82ka-Kawiarnia-Bistro-61555674361494/",
        "body": "Na instagramie posty są publikowane nieregularnie z długimi przerwami które obniżają widoczność w algorytmie. Profil nie korzysta też z Reelsów które szczególnie dobrze sprawdzają się dla kawiarni z domowymi wypiekami.",
    },
    {
        "name": "UkiUki Zgoda",
        "fb": "https://www.facebook.com/p/Uki-Uki-Zgoda-61560458978060/",
        "body": "Na instagramie treści są bardzo podobne do siebie: niemal każdy post to zdjęcie dania bez różnorodności formatów. Profil nie pokazuje też procesu ręcznego robienia udonów co byłoby wyjątkowo angażującym i unikalnym materiałem wideo.",
    },
    {
        "name": "The Brunchery",
        "fb": "https://www.facebook.com/bruncherywarsaw/",
        "body": "Na instagramie posty skupiają się na jedzeniu bez żadnego budowania historii miejsca czy pokazania ludzi za ladą. Brakuje też strategii Stories które mogłyby codziennie informować o menu dnia i przyciągać regularnych gości.",
    },
    {
        "name": "Mayo Bistro",
        "fb": "https://www.facebook.com/mayo.bistro.koszykowa/",
        "body": "Na instagramie mimo rekomendacji Michelin profil nie wykorzystuje tej informacji do budowania zasięgu i nowych obserwujących. Posty pojawiają się też stosunkowo rzadko jak na restaurację z tak silną marką.",
    },
    {
        "name": "Smartass Cafe",
        "fb": "https://www.facebook.com/61557779581518",
        "body": "Na instagramie bio nie zawiera adresu ani godzin otwarcia co sprawia że nowi obserwujący nie wiedzą gdzie i kiedy mogą przyjść. Posty są też publikowane bez żadnej regularnej strategii co mocno ogranicza organiczny zasięg.",
    },
    {
        "name": "Gospoda Grochowska",
        "fb": "https://www.facebook.com/p/Gospoda-Grochowska-100091130782040/",
        "body": "Na instagramie przy bardzo małej liczbie obserwujących profil praktycznie nie rośnie. Posty są rzadkie i bez żadnej strategii hashtagów co sprawia że treści nie docierają do osób szukających polskiej kuchni na Grochowie.",
    },
    {
        "name": "Baraban",
        "fb": "https://www.facebook.com/smbaraban/",
        "body": "Na instagramie posty pojawiają się z dużymi przerwami co algorytm mocno karze obniżając zasięgi. Każdy post ma też bardzo podobną formę: zdjęcie dania z krótkim opisem bez żadnego angażowania społeczności.",
    },
    {
        "name": "Seagull Cafe",
        "fb": "https://www.facebook.com/p/Seagullwarsaw-61575168945073/",
        "body": "Na instagramie profil był bardzo aktywny w sezonie letnim ale poza sezonem aktywność spadła drastycznie co powoduje utratę zasięgów i obserwujących. Brakuje treści wideo które pomogłyby utrzymać widoczność przez cały rok.",
    },
    {
        "name": "ONA Coffee Bar",
        "fb": "https://www.facebook.com/people/ONA-Coffee-Bar/61556781668490/",
        "body": "Na instagramie przy blisko 6 tysiącach obserwujących przerwy między postami sięgają niekiedy kilku tygodni co wyraźnie hamuje dalszy wzrost. Profil nie korzysta też z Reelsów mimo że format ten wyjątkowo dobrze działa dla kawiarni specialty.",
    },
    {
        "name": "WYRAJ",
        "fb": "https://www.facebook.com/p/WYRAJ-100093015502524/",
        "body": "Na instagramie mimo ponad 13 tysięcy obserwujących profil rzadko publikuje materiały wideo co jest dużą straconą szansą dla miejsca z tak ciekawą słowiańską koncepcją. Brakuje też zapiętych Stories Highlights z menu czy historią restauracji.",
    },
    {
        "name": "Moss Cafe",
        "fb": "https://www.facebook.com/mosscafepl/",
        "body": "Na instagramie profil ma stosunkowo mało postów jak na kawiarnie która działa już od dłuższego czasu. Posty pojawiają się też bardzo nieregularnie co sprawia że konto jest praktycznie niewidoczne dla nowych użytkowników.",
    },
    {
        "name": "Bałkańska Dusza",
        "fb": "https://www.facebook.com/restauracjabalkanskadusza/",
        "body": "Na instagramie przy 1407 obserwujących i długim czasie działalności liczba fanów jest bardzo niska co wskazuje że profil nie jest aktywnie prowadzony. Brakuje też Reelsów które pomogłyby szybko dotrzeć do nowych odbiorców w Warszawie.",
    },
    {
        "name": "Fortunata",
        "fb": "https://www.facebook.com/FortunataKawkaOchota/",
        "body": "Na instagramie przy zaledwie ponad tysiącu obserwujących kawiarnia specialty tej klasy mogłaby mieć wielokrotnie większy zasięg. Posty pojawiają się rzadko i bez żadnego wezwania do działania co sprawia że nawet obecni obserwujący rzadko przekładają to na wizytę.",
    },
    {
        "name": "Terra Warsaw",
        "fb": "https://www.facebook.com/terrawarsaw/",
        "body": "Na instagramie przy zaledwie 947 obserwujących zasięgi są minimalne jak na restaurację z centrum Warszawy. Profil nie korzysta też z Reelsów ani Stories Highlights co sprawia że nowi odwiedzający nie mają żadnego powodu żeby zostać.",
    },
    {
        "name": "Kawiarnia Kafka",
        "fb": "https://www.facebook.com/Kawiarnia.Kafka/",
        "body": "Na instagramie profil jest prowadzony bez żadnej strategii: posty pojawiają się nieregularnie i mają bardzo podobną formę. Kawiarnia o takim charakterze i historii mogłaby budować zaangażowaną społeczność ale obecnie profil tego nie robi.",
    },
    {
        "name": "Blisko Bar",
        "fb": "https://www.facebook.com/p/Blisko-Bar-100084125805603/",
        "body": "Na instagramie mimo nagrody Michelin profil nie komunikuje tego osiągnięcia w żaden strategiczny sposób. Brakuje też edukacyjnych treści o winach naturalnych które doskonale sprawdzają się jako angażujący content dla tego typu miejsca.",
    },
    {
        "name": "Musa Bar",
        "fb": "https://www.facebook.com/bar.musa.7/",
        "body": "Na instagramie przy 11 tysiącach obserwujących Reelsy pojawiają się bardzo rzadko. Opisy pod wieloma postami są też bardzo krótkie lub całkowicie ich brak co obniża zasięg organiczny każdego posta.",
    },
    {
        "name": "Boskapraga",
        "fb": "https://www.facebook.com/boskapraga/",
        "body": "Na instagramie mimo dużej liczby obserwujących aktywność jest nieregularna z wyraźnymi przerwami między postami. Treści skupiają się na gotowych daniach bez żadnego pokazania ekipy czy codziennego życia restauracji.",
    },
    {
        "name": "Nova Wola",
        "fb": "https://www.facebook.com/NovaWolaWarsaw/",
        "body": "Na instagramie profil nie buduje żadnej lokalnej społeczności i traktuje go jak tablicę ogłoszeniową. Brakuje Reelsów i angażujących treści które sprawiłyby że mieszkańcy Woli traktowaliby to miejsce jak swoje.",
    },

    # ══════════════════════════════════
    # INSTAGRAM ONLY (15)
    # ══════════════════════════════════
    {
        "name": "Krem Warszawa",
        "fb": "",
        "body": "Na instagramie przy 11 tysiącach obserwujących Reelsy są rzadkie lub słabo zoptymalizowane co sprawia że zasięg organiczny jest nieproporcjonalnie mały. Profil nie korzysta też ze współpracy z lokalnymi twórcami którzy mogliby znacząco zwiększyć widoczność.",
    },
    {
        "name": "Rico Warsaw",
        "fb": "",
        "body": "Na instagramie posty pojawiają się nieregularnie i brakuje im spójnej narracji wizualnej. Profil nie ma też zapiętych Stories Highlights z menu czy lokalizacją co sprawia że nowi odwiedzający nie dostają kluczowych informacji od razu.",
    },
    {
        "name": "Giada",
        "fb": "",
        "body": "Na instagramie posty skupiają się wyłącznie na daniach bez żadnego pokazania wnętrza lokalu czy atmosfery włoskiej restauracji. Opisy są też zbyt krótkie i nie zawierają wezwania do działania ani hashtagów które poszerzyłyby zasięg.",
    },
    {
        "name": "René Cucina",
        "fb": "",
        "body": "Na instagramie profil rzadko aktualizowany z długimi przerwami między postami. Brakuje też Reelsów mimo że format krótkich filmów wyjątkowo dobrze sprawdza się dla włoskiej restauracji gdzie przygotowanie makaronu byłoby naturalnie angażującą treścią.",
    },
    {
        "name": "True Story",
        "fb": "",
        "body": "Na instagramie posty skupiają się wyłącznie na zdjęciach dań bez żadnego budowania historii miejsca czy pokazania wyjątkowej galerii win. Brakuje Reelsów które pomogłyby dotrzeć do nowych odbiorców poza obecnymi obserwującymi.",
    },
    {
        "name": "MADARE",
        "fb": "",
        "body": "Na instagramie bio nie zawiera adresu ani podstawowych informacji o ofercie co sprawia że zainteresowane osoby muszą szukać tych danych gdzie indziej. Brakuje też Reelsów z procesu przygotowania matchy które byłyby naturalnie wiralowym contentem.",
    },
    {
        "name": "BAJS",
        "fb": "",
        "body": "Na instagramie posty pojawiają się nieregularnie i nie angażują obserwujących: brakuje pytań ankiet czy treści które skłaniałyby do komentowania. Profil nie korzysta też z Reelsów mimo że Hala Koszyki to doskonałe tło dla angażujących filmów.",
    },
    {
        "name": "Bozo Cafe",
        "fb": "",
        "body": "Na instagramie profil skupia się wyłącznie na zdjęciach produktów bez żadnego pokazania wnętrza czy atmosfery kawiarni. Posty pojawiają się też nieregularnie co hamuje organiczny wzrost konta.",
    },
    {
        "name": "Biskwit",
        "fb": "",
        "body": "Na instagramie treści skupiają się wyłącznie na tortach i słodkościach bez pokazania kawiarni czy śniadań w formie Reels. Brakuje też regularności postów co algorytm mocno karze obniżając zasięgi.",
    },
    {
        "name": "Kompot",
        "fb": "",
        "body": "Na instagramie przy zaledwie 2116 obserwujących pierogarnia z tak dobrymi recenzjami powinna mieć znacznie więcej fanów online. Posty pojawiają się rzadko i bez hashtagów co sprawia że treści nie trafiają do osób szukających pierogów w Warszawie.",
    },
    {
        "name": "ETC Specialty Coffee",
        "fb": "",
        "body": "Na instagramie zaledwie 1965 obserwujących to bardzo mało jak na lokal ze specialty coffee w Warszawie. Brakuje też Reelsów pokazujących proces parzenia kawy co jest dziś jednym z najskuteczniejszych formatów dla kawiarni specialty.",
    },
    {
        "name": "Żol Pizza Wino",
        "fb": "",
        "body": "Na instagramie posty pojawiają się zbyt rzadko jak na restaurację z tak dobrymi recenzjami i ciekawą ofertą. Profil nie angażuje też obserwujących: brakuje Stories z informacjami o nowych winach w ofercie czy pytaniami o ulubioną pizzę.",
    },
    {
        "name": "Baba Jaga",
        "fb": "",
        "body": "Na instagramie jako nowe miejsce profil nie ma jeszcze żadnej strategii contentu ani regularności postów. Bez aktywnego budowania zasięgu na samym starcie będzie bardzo ciężko zbudować rozpoznawalność w tej dzielnicy.",
    },
    {
        "name": "Irenkacafe",
        "fb": "",
        "body": "Na instagramie profil nie ma zapiętych Stories Highlights co sprawia że nowi odwiedzający od razu nie wiedzą co oferujecie ani gdzie się znajdować. Posty pojawiają się bez żadnej regularności co mocno ogranicza widoczność w algorytmie.",
    },
    {
        "name": "Bazar Bistro",
        "fb": "",
        "body": "Na instagramie treści mieszają bistro sklep i kontent eventowy bez żadnego spójnego przekazu co dezorientuje potencjalnych nowych gości. Brakuje też Reelsów które pomogłyby zbudować szerszy zasięg poza stałymi obserwującymi.",
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
print(f"Skopiowano {len(rows)} DMów do schowka.")
print()
for i, l in enumerate(leads, 1):
    fb_status = "FB" if l["fb"] else "IG only"
    print(f"{i:2}. [{fb_status}] {l['name']}")
