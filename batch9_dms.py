import subprocess

opening = "Trafiłem na wasze social media i muszę przyznać że wasze danie wyglądają naprawde przepysznie! Jednak zauważyłem też, że restauracja nie wykorzystuje w pełni potencjału social mediów. "
closing = "\n\nJestem młodym social media managerem i chciałbym wam pomóc w ulepszeniu waszych socjali. Pomogłem już jednemu z moich klientów zwiększyć zasięgi z 300 wyświetleń w ciągu dwóch miesięcy do 30 000 wyświetleń w 60 dni bez żadnych płatnych reklam. Jeśli to Państwa ciekawi, chętnie wyślę parę przykładów mojej pracy aby dać Państwu lepszą perspektywę."

def dm(body, fb):
    link = (fb + "\n\n") if fb else ""
    return link + opening + body + closing

leads = [
    # ══════════════════════════════════
    # LEADS WITH FACEBOOK (36)
    # ══════════════════════════════════
    {
        "name": "Muszelka",
        "fb": "https://www.facebook.com/p/Muszelka-61559795650210/",
        "body": "Na instagramie mimo wyjątkowego wnętrza z morskim klimatem i charakterystycznych wypieków profil nie korzysta z Reelsów które byłyby naturalnie popularnym contentem dla kawiarni z taką estetyką. Posty pojawiają się też bez regularności co spowalnia organiczny wzrost obserwujących.",
    },
    {
        "name": "Rosalia",
        "fb": "https://www.facebook.com/rosalia.warszawa/",
        "body": "Na instagramie restauracja z klimatem Portu Praskiego i konceptem kuchni polskich wspomnień nie korzysta z Reelsów do prezentacji domowych nalewek i sezonowego menu które byłyby naturalnie angażującą treścią. Brakuje spójnej narracji wizualnej pasującej do charakteru miejsca.",
    },
    {
        "name": "Chałka Kawiarnia Bistro",
        "fb": "https://www.facebook.com/p/Cha%C5%82ka-Kawiarnia-Bistro-61555674361494/",
        "body": "Na instagramie piekarnia znana z ręcznie pieczonych chałek nie pokazuje procesu wypieku który byłby naturalnie wiralowym contentem wśród miłośników piekarstwa. Posty pojawiają się bez regularności mimo że regularne Reelsy z pieczenia przyniosłyby duży zasięg organiczny.",
    },
    {
        "name": "Pół na Puł",
        "fb": "https://www.facebook.com/polnapul/",
        "body": "Na instagramie restauracja z wyjątkowym konceptem food sharingu i kuchnią śródziemnomorską nie korzysta z Reelsów które mogłyby wizualnie pokazać filozofię wspólnego stołu i różnorodność menu. Brakuje spójnej strategii dla miejsca które łączy śniadania pizzę canotto i wydarzenia kulturalne.",
    },
    {
        "name": "Salto Bar",
        "fb": "https://www.facebook.com/p/salto-bar-61559444644153/",
        "body": "Na instagramie lokalna kawiarnia i pizzeria na Sadach Żoliborskich nie korzysta z Reelsów do prezentacji nowojorskich bagli ani pizzy rzymskiej mimo że tego rodzaju content zyskuje dziś największe zasięgi w tej niszy. Posty pojawiają się nieregularnie co osłabia widoczność profilu.",
    },
    {
        "name": "Uki Uki Zgoda",
        "fb": "https://www.facebook.com/p/Uki-Uki-Zgoda-61560458978060/",
        "body": "Na instagramie nowa lokalizacja kultowego UkiUki przy Zgodzie nie ma jeszcze własnej silnej tożsamości contentowej. Brakuje Reelsów z przygotowania udonu i ramenu które są dziś najskuteczniejszym formatem w niszy kuchni japońskiej i przyciągałyby nowych obserwujących.",
    },
    {
        "name": "Arigatorii House of Udon",
        "fb": "https://www.facebook.com/p/Arigatorii-61579459533827/",
        "body": "Na instagramie restauracja specjalizująca się w japońskim udonie nie pokazuje procesu przygotowania głębokich bulionów ani techniki składania miski co byłoby naturalnie popularnym contentem. Brakuje regularnych Reelsów mimo że restauracja działa już od kilku miesięcy.",
    },
    {
        "name": "Va Bene Centro",
        "fb": "https://www.facebook.com/p/Va-Bene-Centro-61579268053242/",
        "body": "Na instagramie włoskie bistro z instalacjami ceramicznymi nie korzysta z tej wyjątkowej przestrzeni do tworzenia wyróżniającego się contentu. Brakuje Reelsów z przygotowania włoskich dań i storytellingu o produktach który jest dziś najskuteczniejszym formatem dla restauracji włoskich.",
    },
    {
        "name": "Dwójka Kielichów",
        "fb": "https://www.facebook.com/p/Dw%C3%B3jka-Kielich%C3%B3w-61558424311493/",
        "body": "Na instagramie wine bar i kawiarnia przy Nieporęckiej nie ma spójnej strategii contentowej która wyraźnie komunikowałaby charakter miejsca przez cały dzień od kawy rano do wina wieczorem. Brakuje Reelsów z selekcji win które byłyby naturalnym i angażującym contentem.",
    },
    {
        "name": "HAŁAS Coffee + Vinyl",
        "fb": "https://www.facebook.com/halas.warsaw/",
        "body": "Na instagramie kawiarnia z unikalnym połączeniem specialty coffee i sklepu winylowego nie korzysta z Reelsów które mogłyby pokazać kawową i muzyczną pasję właścicieli. Brakuje treści łączących oba światy choć taki content byłby wysoce angażujący i wyróżniający profil.",
    },
    {
        "name": "SOLE! Powiśle",
        "fb": "https://www.facebook.com/sole.powisle/",
        "body": "Na instagramie mimo 14 tysięcy obserwujących Reelsy pojawiają się rzadko co sprawia że jeden z najpopularniejszych lokali na Powiślu nie w pełni korzysta ze swojego potencjału zasięgowego. Brakuje filmów z przygotowania pizzy neapolitańskiej które są jednym z najbardziej popularnych formatów kulinarnych.",
    },
    {
        "name": "Machupisko Latino Tapas Bar",
        "fb": "https://www.facebook.com/people/Machupisko-Latino-BAR-Tapas/61588502726234/",
        "body": "Na instagramie peruwiański bar z latino muzyką nie pokazuje w Reelsach żywego klimatu wieczorów tanecznych który byłby naturalnie wiralowym contentem i przyciągałby nowych gości. Profil skupia się głównie na zdjęciach statycznych bez materiałów wideo.",
    },
    {
        "name": "Marumi",
        "fb": "https://www.facebook.com/MarumiPolska/",
        "body": "Na instagramie restauracja łącząca kuchnię azjatycką ze śródziemnomorską nie korzysta z Reelsów do komunikowania swojego unikalnego konceptu kulinarnego. Brakuje filmów z przygotowania dań fusion co jest dziś standardem dla restauracji w tym segmencie.",
    },
    {
        "name": "Supperlardo",
        "fb": "https://www.facebook.com/Supperlardo/",
        "body": "Na instagramie restauracja rzemieślnicza specjalizująca się w wędlinach i chlebie nie pokazuje procesu ich tworzenia który byłby naturalnie angażującym contentem dla miłośników food crafting. Brakuje Reelsów z kuchni mimo że właśnie ten format generuje największe zasięgi dla restauracji rzemieślniczych.",
    },
    {
        "name": "Tekla",
        "fb": "https://www.facebook.com/p/Tekla-kawa-i-winyle-61566468751649/",
        "body": "Na instagramie kawiarnia łącząca specialty coffee z winylami i społeczną misją ma stosunkowo małą bazę obserwujących jak na miejsce z tak interesującą historią. Brakuje Reelsów pokazujących atmosferę cuppingów czy wydarzeń muzycznych które byłyby idealnym formatem dla tej wyjątkowej kawiarni.",
    },
    {
        "name": "Fat White Coffee Bar",
        "fb": "https://www.facebook.com/FatWhiteCoffee/",
        "body": "Na instagramie kawiarnia specialty z Muranowa przy blisko 5 tysiącach obserwujących nie korzysta z Reelsów mimo że charakterna przestrzeń z kolekcją figurek byłaby doskonałym tłem dla wyróżniającego się contentu. Brakuje też regularności w postach co hamuje wzrost organiczny.",
    },
    {
        "name": "Artystyczne Cafe",
        "fb": "https://www.facebook.com/p/Artystyczne-Cafe-61579589008809/",
        "body": "Na instagramie kawiarnia na Żoliborzu Artystycznym nie łączy wyraźnie jedzenia z wystawami młodych artystów co jest zmarnowanym potencjałem wyjątkowej przestrzeni. Brakuje Reelsów dokumentujących wernisaże i artystyczne wydarzenia które przyciągałyby nową publiczność.",
    },
    {
        "name": "Create Cafe",
        "fb": "https://www.facebook.com/p/Create-Cafe-61577704116013/",
        "body": "Na instagramie mimo 20 tysięcy obserwujących kawiarnia ceramiczna przy Żelaznej nie korzysta w pełni z formatów wideo które byłyby naturalnym contentem dla miejsca gdzie goście sami malują ceramikę. Brakuje Reelsów pokazujących cały proces od czystego naczynia do gotowego dzieła.",
    },
    {
        "name": "Lalou Wine Bar",
        "fb": "https://www.facebook.com/lalouwinebarandshop/",
        "body": "Na instagramie wine bar z jedną z największych selekcji win w Polsce nie buduje żadnej edukacyjnej narracji o winie mimo że storytelling winny jest dziś najbardziej skutecznym formatem dla tego rodzaju miejsc. Brakuje Reelsów prezentujących wyjątkowe etykiety z ich historią i charakterem.",
    },
    {
        "name": "Mund",
        "fb": "https://www.facebook.com/p/MUND-61570085023504/",
        "body": "Na instagramie skandynawska restauracja i wine bar w hotelu PURO nie korzysta z Reelsów pokazujących autentyczne smørrebrød i duńskie śniadania mimo że nordycka estetyka byłaby naturalnie angażującym contentem. Brakuje też treści podkreślających wyjątkową lokalizację przy Teatrze Narodowym.",
    },
    {
        "name": "OKEH Bakery",
        "fb": "https://www.facebook.com/okeh.bakery/",
        "body": "Na instagramie piekarnia z azjatyckim twistem i matchą przy Marszałkowskiej mimo dobrego zasięgu nie korzysta regularnie z Reelsów pokazujących proces wypieku. Brakuje narracji o japońskim pochodzeniu matchy i rzemieślniczej jakości która wyróżniałaby profil wśród rosnącej konkurencji.",
    },
    {
        "name": "Kubuś Piekarenka",
        "fb": "https://www.facebook.com/p/Kubu%C5%9B-Piekarenka-61553888190167/",
        "body": "Na instagramie piekarnia z kilkoma lokalizacjami w Warszawie mimo 24 tysięcy obserwujących nie ma spójnej strategii która budowałaby silną markę. Brakuje Reelsów z procesu wypieku które regularnie generują największe zasięgi dla piekarni i zdecydowanie zwiększyłyby rozpoznawalność.",
    },
    {
        "name": "Mayo Bistro",
        "fb": "https://www.facebook.com/mayo.bistro.koszykowa/",
        "body": "Na instagramie bistro rekomendowane przez Michelin przy zaledwie 5 tysiącach obserwujących ma ogromny potencjał na zwiększenie zasięgu który wspierałby rezerwacje. Brakuje Reelsów ze zmieniającego się sezonowego menu i pracy w kuchni które byłyby naturalnym contentem dla bistro tego poziomu.",
    },
    {
        "name": "HALA Cafe",
        "fb": "https://www.facebook.com/sadycafe/",
        "body": "Na instagramie kawiarnia przy Sadach Żoliborskich z charakternym konceptem rowerowym i zielonym wnętrzem nie korzysta z Reelsów które mogłyby pokazać ten klimat i przyciągnąć społeczność Żoliborza. Brakuje spójnej strategii contentowej budującej lokalne zaangażowanie.",
    },
    {
        "name": "Fortunata Kawka",
        "fb": "https://www.facebook.com/FortunataKawkaOchota/",
        "body": "Na instagramie kawiarnia prowadzona przez sommelierką i łącząca specialty coffee z selekcją win ma zaledwie 1103 obserwujących co jest bardzo niskie dla tak unikalnego konceptu. Brakuje Reelsów łączących świat kawy i wina co byłoby naprawdę wyróżniającym contentem w Warszawie.",
    },
    {
        "name": "Cynamo.onka",
        "fb": "https://www.facebook.com/p/Cynamoonka-61566934961040/",
        "body": "Na instagramie przy 11 tysiącach obserwujących kawiarnia z oryginalnymi cynamonkami w 8 smakach nie korzysta w pełni z Reelsów które byłyby wiralowym contentem dla tego formatu. Brakuje filmów z wypieku i zapowiedzi nowych smaków które są standardem dla popularnych kawiarni ze słodkościami.",
    },
    {
        "name": "Bochena Koncept",
        "fb": "https://www.facebook.com/bochena.warszawa/",
        "body": "Na instagramie piekarnia i kawiarnia spółdzielcza z Ochoty mimo 6 tysięcy obserwujących nie korzysta regularnie z Reelsów które pokazywałyby rzemieślniczy proces pieczenia chleba. Brakuje też treści o społecznej misji miejsca które byłyby naturalnie angażującym contentem dla szerszej publiczności.",
    },
    {
        "name": "Corner Cafe",
        "fb": "https://www.facebook.com/TheCornerWarsaw/",
        "body": "Na instagramie kawiarnia w centrum Warszawy przy Chałubińskiego ma zaledwie 561 obserwujących co wskazuje na brak jakiejkolwiek strategii wzrostu. Brakuje Reelsów z porannych śniadań i specialty coffee które byłyby naturalnym punktem startowym dla budowania społeczności.",
    },
    {
        "name": "Jeju Korea",
        "fb": "https://www.facebook.com/JejuKoreaWarszawa/",
        "body": "Na instagramie restauracja z autentyczną kuchnią koreańską na Saskiej Kępie mimo prawie 2 tysięcy obserwujących nie korzysta z Reelsów do prezentacji tradycyjnych dań które są dziś jednym z najpopularniejszych formatów kulinarnych. Brakuje edukacyjnych treści o koreańskiej kuchni i kulturze.",
    },
    {
        "name": "Sylvia Crystal Cafe",
        "fb": "https://www.facebook.com/p/Sylvia-Crystal-Cafe-61567167953976/",
        "body": "Na instagramie wyjątkowa kawiarnia z kryształami i zdrową kuchnią mimo 10 tysięcy obserwujących nie korzysta w pełni z Reelsów które pokazywałyby terapeutyczny i estetyczny klimat miejsca. Brakuje filmów z przygotowania dań wellness i prezentacji kryształów które byłyby naturalnie wiralowym contentem.",
    },
    {
        "name": "Trzy Kruki",
        "fb": "https://www.facebook.com/TrzyKruki/",
        "body": "Na instagramie przy blisko 6 tysiącach obserwujących kawiarnia specialty z Placu Hallera nie korzysta aktywnie z Reelsów które generowałyby nowych obserwujących i zasięgi. Brakuje edukacyjnego contentu o kawie i naturalnym winie mimo że to właśnie ten format jest najskuteczniejszy dla kawiarni specialty.",
    },
    {
        "name": "Kawiarnia Waszyngton",
        "fb": "https://www.facebook.com/waszyngton96/",
        "body": "Na instagramie kawiarnia na Alei Waszyngtona z dwiema lokalizacjami ma stosunkowo niski zasięg jak na miejsce z kilkuletnią historią i stałą klientelą. Brakuje Reelsów ze śniadań i specialty coffee które regularnie generują największe zasięgi w tej kategorii lokali.",
    },
    {
        "name": "Nicoletta Saska Kępa",
        "fb": "https://www.facebook.com/nicolettasaskakepa/",
        "body": "Na instagramie restauracja na Saskiej Kępie mimo kilku lokalizacji sieci nie buduje spójnej narracji contentowej dla swojej praskiej odsłony. Brakuje Reelsów ze śródziemnomorskiego menu i atmosfery Saskiej Kępy które mogłyby wyróżnić tę lokalizację na tle centrum.",
    },
    {
        "name": "Moss Cafe",
        "fb": "https://www.facebook.com/mosscafepl/",
        "body": "Na instagramie bistro w Forcie Praskim przy zaledwie 2102 obserwujących nie wykorzystuje historycznej lokalizacji do budowania wyróżniającego się contentu. Brakuje Reelsów ze śniadań i atmosfery fortu które byłyby naturalnie angażującym contentem dla miłośników Pragi.",
    },
    {
        "name": "Onda Cafe",
        "fb": "https://www.facebook.com/p/Onda-Cafe-100083318559565/",
        "body": "Na instagramie kawiarnia z włoskim i nadmorskim klimatem na Żoliborzu nie korzysta z Reelsów które mogłyby pokazać wyjątkowe gofry słodkie i wytrawne. Brakuje spójnej narracji wokół morskiej estetyki która wyróżniałaby profil na tle innych kawiarni na Żoliborzu.",
    },
    {
        "name": "Doenji Korean Food",
        "fb": "https://www.facebook.com/doenjik/",
        "body": "Na instagramie koreański street food przy Górczewskiej nie korzysta z Reelsów do pokazania przygotowania posiłków w stylu ulicznym mimo że tego rodzaju content jest dziś jednym z najbardziej popularnych formatów w niszy kuchni koreańskiej. Brakuje spójnej strategii contentowej.",
    },

    # ══════════════════════════════════
    # INSTAGRAM ONLY (14)
    # ══════════════════════════════════
    {
        "name": "Blisko Bar",
        "fb": "",
        "body": "Na instagramie przy prawie 9 tysiącach obserwujących wine bar na Stalowej nie korzysta regularnie z Reelsów których zasięg mógłby być wielokrotnie wyższy jak na lokal z tak charakterną przestrzenią. Brakuje edukacyjnych treści o winach naturalnych które byłyby naturalnym formatem dla wine baru.",
    },
    {
        "name": "René Cucina",
        "fb": "",
        "body": "Na instagramie przy ponad 4 tysiącach obserwujących włoska restauracja na Saskiej Kępie nie korzysta z Reelsów które byłyby naturalnym contentem dla sezonowej kuchni włoskiej. Brakuje filmów z przygotowania potraw i storytellingu o produktach które są standardem dla popularnych restauracji włoskich.",
    },
    {
        "name": "BAGL",
        "fb": "",
        "body": "Na instagramie nowa kawiarnia z baglami i kanapkami z topingiem w centrum Warszawy praktycznie nie istnieje online mimo że bagel i śniadaniowy content są jednym z najpopularniejszych trendów kulinarnych. Brakuje Reelsów ze składania i pieczenia bagli które generują dziś ogromne zasięgi organiczne.",
    },
    {
        "name": "UMI",
        "fb": "",
        "body": "Na instagramie nowa kawiarnia na Żoliborzu Artystycznym łącząca specialty coffee ze śniadaniami i burgerami nie ma jeszcze żadnej strategii contentowej która wyróżniałaby ją spośród innych żoliborskich kawiarni. Brakuje Reelsów które pokazywałyby różnorodność menu przez cały dzień.",
    },
    {
        "name": "KISSA",
        "fb": "",
        "body": "Na instagramie tradycyjna japońska kawiarnia w stylu kissa na Służewcu nie korzysta z Reelsów które mogłyby opowiadać historię japońskiej kultury kawowej i wyróżniać lokal na tle rosnącej konkurencji. Brakuje edukacyjnego contentu o japońskich metodach parzenia i ceremonialnym podejściu do kawy.",
    },
    {
        "name": "Warszawski Tygrys",
        "fb": "",
        "body": "Na instagramie restauracja uznawana za jedno z najgorętszych otwarć sezonu i polecana przez Michelin ma stosunkowo niski zasięg organiczny jak na tak głośne miejsce. Brakuje Reelsów z kuchni pokazujących fuzję polskiej tradycji z azjatyckimi inspiracjami co byłoby naturalnie wiralowym contentem.",
    },
    {
        "name": "Rozdział",
        "fb": "",
        "body": "Na instagramie fine dining na Powiślu przy zaledwie 2506 obserwujących nie korzysta z Reelsów które byłyby standardem dla restauracji na tym poziomie i pomagałyby budować rezerwacje. Brakuje filmów z technikami szefa kuchni i degustacji których oczekuje dziś publiczność fine dining.",
    },
    {
        "name": "Kredki",
        "fb": "",
        "body": "Na instagramie kawiarnia i concept store na Żoliborzu łącząca kawę z polskim designem i literaturą nie korzysta z Reelsów które mogłyby pokazać tę wyjątkową wielowymiarową przestrzeń. Brakuje spójnej strategii contentowej dla miejsca które oferuje tak wiele ponad samą kawę.",
    },
    {
        "name": "NOW Coffeebar",
        "fb": "",
        "body": "Na instagramie kawiarnia specialty na Włochach nie korzysta z Reelsów mimo że jest jednym z niewielu miejsc z naprawdę dobrą kawą w tej części Warszawy. Brakuje contentu który pozwoliłby jej budować rozpoznawalność wykraczającą poza sąsiednie osiedla.",
    },
    {
        "name": "Musa Bar",
        "fb": "",
        "body": "Na instagramie wine bar z włoskimi lodami i małymi talerzykami przy Wilczej nie korzysta z Reelsów które mogłyby pokazać wyjątkową fuzję gelato i wina co jest unikalnym i naturalnie wiralowym konceptem. Brakuje też regularności w postach co hamuje budowanie stałej widowni.",
    },
    {
        "name": "Madare",
        "fb": "",
        "body": "Na instagramie sklep i bar z japońską ceremonialną herbatą na Saskiej Kępie nie korzysta z Reelsów które mogłyby edukować o kulturze parzenia herbaty i premium produktach japońskich co jest dziś bardzo popularnym formatem. Brakuje storytellingu o japońskiej kulturze herbacianej.",
    },
    {
        "name": "Etc. Specialty Coffee",
        "fb": "",
        "body": "Na instagramie kawiarnia specialty w klimacie śródziemnomorskim na Żupniczej nie korzysta z Reelsów mimo że minimalistyczne wnętrze z drzewem oliwnym byłoby doskonałym tłem dla angażujących filmów. Brakuje też regularności w postach co utrudnia budowanie stałego zasięgu.",
    },
    {
        "name": "Spożywczy Cafe",
        "fb": "",
        "body": "Na instagramie kawiarnia w zabytkowym Szklanym Domu z lat 30. nie korzysta z historii i wyjątkowej architektury miejsca do tworzenia wyróżniającego się contentu. Brakuje Reelsów które pokazywałyby tę niezwykłą przestrzeń i łączyły ją z codziennym rytuałem kawy i śniadania.",
    },
    {
        "name": "Kim Chi Ken",
        "fb": "",
        "body": "Na instagramie restauracja z koreańskim fried chicken przy Marszałkowskiej nie korzysta z Reelsów do pokazania crispy kurczaka w stylu koreańskim który jest dziś jednym z najbardziej wiralowych formatów w niszy food contentu. Brakuje angażujących filmów mimo ogromnego potencjału wizualnego produktu.",
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
