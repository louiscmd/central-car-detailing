import kandinsky as kd
import math

W,H=320,222
FH=18
BAR_H=FH+4
CHAT_H=H-BAR_H
MAX_LINES=CHAT_H//FH
LC=32

WHITE=kd.color(255,255,255)
BLACK=kd.color(20,20,20)
BLUE=kd.color(0,100,210)
GREY=kd.color(220,220,235)
DKG=kd.color(80,80,80)
DIV=kd.color(180,180,200)

SAFE={k:getattr(math,k) for k in dir(math) if not k.startswith("_")}
SAFE["__builtins__"]={}

def calc(t):
    t=t.lower().strip()
    for p in("calculate","what is","solve","calc","compute"):
        if t.startswith(p):t=t[len(p):].strip()
    t=t.replace("^","**").rstrip("?=").strip()
    try:
        r=eval(t,SAFE)
        if isinstance(r,(int,float)):return"= "+str(round(r,6))
    except:pass
    return None

KB=[
(["hello","hi","hey"],"Hello! Ask me anything."),
(["bye","quit","exit"],"Goodbye! Good luck!"),
(["pythagor"],"a^2+b^2=c^2"),
(["quadratic"],"x=(-b+/-sqrt(b^2-4ac))/2a"),
(["discriminant"],"D=b^2-4ac D>0:2roots D=0:1 D<0:0"),
(["derivative","differenti"],"(x^n)'=nx^(n-1) (sin)'=cos (e^x)'=e^x"),
(["integral","integrat"],"int x^n=x^(n+1)/(n+1)+C"),
(["chain rule"],"d/dx f(g(x))=f'(g(x))*g'(x)"),
(["product rule"],"(uv)'=u'v+uv'"),
(["quotient rule"],"(u/v)'=(u'v-uv')/v^2"),
(["mean","average"],"Mean=sum/count"),
(["median"],"Middle value of sorted data"),
(["variance","standard dev"],"SD=sqrt(avg(x-mean)^2)"),
(["probability"],"P=favourable/total 0<=P<=1"),
(["permutation"],"P(n,r)=n!/(n-r)!"),
(["combination"],"C(n,r)=n!/(r!(n-r)!)"),
(["prime"],"Divisible only by 1 and itself"),
(["factorial"],"n!=n*(n-1)*...*1 5!=120"),
(["logarithm","log base"],"log_b(x)=y means b^y=x"),
(["circle area"],"A=pi*r^2"),
(["circumference"],"C=2*pi*r"),
(["triangle area"],"A=base*height/2"),
(["sphere volume"],"V=(4/3)*pi*r^3"),
(["cylinder volume"],"V=pi*r^2*h"),
(["trigon","sin cos tan"],"sin=opp/hyp cos=adj/hyp tan=sin/cos"),
(["newton first","inertia"],"Object stays at rest unless force acts"),
(["newton second","f=ma"],"F=m*a"),
(["newton third","action react"],"Every action has equal opposite reaction"),
(["kinematics","suvat"],"v=u+at s=ut+0.5at^2 v^2=u^2+2as"),
(["kinetic energy"],"KE=0.5*m*v^2"),
(["potential energy"],"PE=m*g*h g=9.81"),
(["work done"],"W=F*d*cos(angle) Joules"),
(["momentum"],"p=mv Conserved in closed systems"),
(["gravitat"],"F=G*m1*m2/r^2 G=6.674e-11"),
(["ohm"],"V=I*R"),
(["wavelength","wave"],"v=f*lambda T=1/f"),
(["speed of light"],"c=3e8 m/s"),
(["pressure"],"P=F/A Pascals"),
(["ideal gas","pv=nrt"],"PV=nRT R=8.314 T in Kelvin"),
(["thermodynamics first"],"dU=Q-W Energy conserved"),
(["thermodynamics second"],"Entropy always increases"),
(["specific heat"],"Q=m*c*deltaT"),
(["fission"],"Heavy nucleus splits Releases energy"),
(["fusion"],"Light nuclei combine Releases energy"),
(["half life","radioact"],"N=N0*(0.5)^(t/t_half)"),
(["relativity","e=mc"],"E=mc^2"),
(["atomic number"],"= number of protons"),
(["mass number"],"= protons + neutrons"),
(["periodic table"],"118 elements Groups=cols Periods=rows"),
(["alkali metal"],"Group1 Li Na K 1 valence e-"),
(["halogen"],"Group17 F Cl Br I 7 valence e-"),
(["noble gas"],"Group18 He Ne Ar Full shell Unreactive"),
(["ionic bond"],"Metal gives e- to nonmetal"),
(["covalent bond"],"Nonmetals share electron pairs"),
(["redox","oxidation"],"OIL RIG Oxidation=Loss Reduction=Gain"),
(["acid","ph"],"pH<7=acid pH=7=neutral pH>7=base"),
(["mole","avogadro"],"1mol=6.022e23 particles"),
(["molar mass"],"Sum of atomic masses g/mol"),
(["molarity"],"M=moles/litres"),
(["enthalpy"],"dH=H_prod-H_react Exothermic:dH<0"),
(["catalyst","activation energy"],"Lowers activation energy speeds reaction"),
(["le chatelier"],"System shifts to oppose change"),
(["alkane"],"CnH2n+2 CH4 C2H6 C3H8"),
(["alkene"],"CnH2n one C=C Ethene C2H4"),
(["mitochondria"],"Site of respiration Powerhouse of cell"),
(["chloroplast"],"Site of photosynthesis Has chlorophyll"),
(["dna"],"Double helix A-T G-C base pairs"),
(["mitosis"],"Prophase Metaphase Anaphase Telophase 2cells"),
(["meiosis"],"4 haploid gametes 23 chromosomes"),
(["photosynthesis"],"6CO2+6H2O+light->C6H12O6+6O2"),
(["respiration"],"C6H12O6+6O2->6CO2+6H2O+ATP"),
(["enzyme"],"Biological catalyst Lock+key model"),
(["osmosis"],"Water low->high solute through membrane"),
(["diffusion"],"Particles high->low concentration"),
(["natural selection"],"Variation survival reproduction inheritance"),
(["evolution"],"Change in allele frequency over time"),
(["taxonomy"],"Kingdom Phylum Class Order Family Genus Species"),
(["food chain"],"Producer->1st->2nd->3rd consumer"),
(["genghis khan","mongol"],"Genghis Khan 1162-1227 largest land empire"),
(["kublai khan"],"Grandson Genghis Yuan Dynasty China 1271"),
(["roman empire"],"27BC-476AD Augustus first emperor"),
(["julius caesar"],"Roman dictator Killed 44BC Ides of March"),
(["alexander the great"],"Macedonian 356-323BC Persia Egypt India"),
(["athens"],"Birthplace democracy Socrates Plato Aristotle"),
(["sparta"],"Military city-state Boys trained age 7"),
(["persian empire","achaemenid"],"Cyrus 550BC Defeated by Alexander 330BC"),
(["thermopylae"],"480BC 300 Spartans vs Persians 3 days"),
(["ancient egypt"],"3100-30BC Pharaohs pyramids hieroglyphics"),
(["cleopatra"],"Last pharaoh Died 30BC Egypt to Rome"),
(["mesopotamia"],"First civilization Tigris+Euphrates Sumer Babylon"),
(["hammurabi"],"First law code 1754BC Eye for eye"),
(["qin","first emperor of china"],"Qin Shi Huang unified China 221BC"),
(["great wall"],"21000km Built vs northern invasions"),
(["silk road"],"China to Mediterranean trade 4000km"),
(["ottoman empire"],"1299-1922 SE Europe Middle East N.Africa"),
(["suleiman"],"Ottoman sultan 1520-1566 Peak of empire"),
(["constantinople"],"1453 Mehmed II End of Byzantine Empire"),
(["aztec"],"Tenochtitlan Conquered by Cortes 1521"),
(["inca"],"Cusco Conquered by Pizarro 1533"),
(["crusades"],"1096-1291 Christian expeditions to Holy Land"),
(["black death","bubonic"],"1347-1351 Killed 1/3 of Europe"),
(["magna carta"],"1215 Limited kings power Law foundation"),
(["joan of arc"],"1412-1431 Led France at Orleans Burned alive"),
(["viking"],"Norse seafarers 793-1066 Explored to N.America"),
(["charlemagne"],"King of Franks Holy Roman Emperor 800AD"),
(["french revolution"],"1789-1799 Overthrew monarchy Liberty equality"),
(["napoleon"],"Emperor 1769-1821 Conquered Europe Waterloo 1815"),
(["industrial revolution"],"1760-1840 Britain Steam power factories"),
(["american independence"],"July 4 1776 13 colonies free from Britain"),
(["american civil war"],"1861-1865 Union vs Confederacy Over slavery"),
(["abraham lincoln"],"16th President Abolished slavery Killed 1865"),
(["world war 1","ww1","first world war"],"1914-1918 Franz Ferdinand 20M dead"),
(["franz ferdinand"],"Assassinated June 28 1914 Triggered WW1"),
(["treaty of versailles"],"1919 Ended WW1 Germany blamed Led to WW2"),
(["world war 2","ww2","second world war"],"1939-1945 Allies vs Axis Atomic bombs"),
(["holocaust"],"Nazi genocide 6M Jews Auschwitz"),
(["d-day","normandy"],"June 6 1944 Allied invasion of France"),
(["hiroshima","nagasaki"],"Aug 1945 Atomic bombs Japan surrendered"),
(["cold war"],"1947-1991 USA vs USSR Arms race space race"),
(["cuban missile"],"Oct 1962 USSR missiles Cuba 13 days crisis"),
(["berlin wall"],"Built 1961 Fell 1989 Cold War symbol"),
(["stalin"],"Soviet leader Great Purge 20M died from policies"),
(["hitler"],"Nazi dictator WW2 Holocaust Suicide 1945"),
(["mao zedong"],"Founded PRC 1949 45M died from policies"),
(["russian revolution"],"1917 Lenin overthrew Tsar Communist state"),
(["vietnam war"],"1955-1975 North communist won vs South+USA"),
(["nelson mandela"],"Anti-apartheid 27yrs prison President 1994"),
(["gandhi"],"Non-violent independence India free 1947"),
(["renaissance"],"14th-17th c Art science rebirth Da Vinci"),
(["galileo"],"Heliocentrism Telescope Tried by Inquisition"),
(["copernicus"],"Heliocentric model Sun at centre 1473-1543"),
(["columbus"],"Reached Americas 1492 sailing for Spain"),
(["british empire"],"At peak 24% of world land area"),
(["moon landing","apollo 11"],"July 20 1969 Armstrong first on Moon"),
(["yuri gagarin"],"First in space April 12 1961 108 minutes"),
(["september 11"],"Sep 11 2001 Al-Qaeda 2977 killed"),
(["capital of france"],"Paris"),
(["capital of germany"],"Berlin"),
(["capital of spain"],"Madrid"),
(["capital of italy"],"Rome"),
(["capital of uk","capital of england"],"London"),
(["capital of usa","capital of america"],"Washington D.C."),
(["capital of canada"],"Ottawa"),
(["capital of australia"],"Canberra"),
(["capital of japan"],"Tokyo"),
(["capital of china"],"Beijing"),
(["capital of russia"],"Moscow"),
(["capital of brazil"],"Brasilia"),
(["capital of india"],"New Delhi"),
(["capital of egypt"],"Cairo"),
(["capital of argentina"],"Buenos Aires"),
(["largest country"],"Russia 17.1Mkm2"),
(["smallest country"],"Vatican City 0.44km2"),
(["most populated","most populous"],"China and India 1.4 billion each"),
(["continents"],"Africa Antarctica Asia Australia Europe N.America S.America"),
(["longest river"],"Nile 6650km Amazon 6400km"),
(["mount everest","highest mountain"],"Everest 8849m Nepal Himalayas"),
(["mariana trench","deepest ocean"],"11034m deep Pacific Ocean"),
(["largest ocean"],"Pacific 165Mkm2 covers 1/3 of Earth"),
(["largest desert"],"Antarctic 14.2Mkm2 Sahara largest hot desert"),
(["tectonic"],"Plates move 2-10cm/yr Earthquakes volcanoes"),
(["greenhouse","climate change"],"CO2 CH4 trap heat +1.1C since 1880"),
(["socrates"],"470-399BC Socratic method Know thyself Hemlock"),
(["plato"],"428-348BC Student of Socrates Theory of Forms"),
(["aristotle"],"384-322BC Tutor to Alexander Logic ethics"),
(["darwin"],"Evolution natural selection Origin of Species 1859"),
(["marie curie"],"Discovered polonium radium First female Nobel"),
(["einstein"],"E=mc^2 Relativity Nobel 1921"),
(["black hole"],"Gravity so strong nothing escapes not even light"),
(["big bang"],"Universe began 13.8 billion years ago"),
(["solar system"],"Mercury Venus Earth Mars Jupiter Saturn Uranus Neptune"),
(["pi"],"pi=3.14159265"),
(["gravity"],"g=9.81 m/s^2 on Earth"),
]

_log=[]

_QW=["what is ","what are ","what was ","what were ",
     "who is ","who was ","who were ","where is ","where was ",
     "when was ","when did ","when is ","how does ","how do ",
     "how did ","why did ","why is ","which ","tell me about ",
     "explain ","define ","describe ","who ruled ","who founded ",
     "who invented ","who discovered ","who built ","what empire ",
     "which empire ","which country ","what country "]

def match(text):
    c=calc(text)
    if c:return c
    t=text.lower().strip().rstrip("?!.")
    attempts=[t]
    for qw in _QW:
        if t.startswith(qw):
            attempts.append(t[len(qw):].strip())
            break
    best,blen=None,0
    for attempt in attempts:
        for keys,ans in KB:
            for k in keys:
                if not k:continue
                if len(k)<=4:
                    pad=" "+attempt+" "
                    found=(" "+k+" ") in pad or (" "+k+"?") in pad
                else:
                    found=k in attempt
                if found and len(k)>blen:
                    best=ans
                    blen=len(k)
    return best or"I don't know. Try a keyword."

def wrap(text):
    words=text.split()
    lines,cur=[],""
    for w in words:
        cand=(cur+" "+w).strip()
        if len(cand)<=LC:cur=cand
        else:
            if cur:lines.append(cur)
            cur=w
    if cur:lines.append(cur)
    return lines or[""]

def push(spk,text,isu):
    lbl=spk+": "
    for i,ln in enumerate(wrap(text)):
        _log.append(((lbl if i==0 else"  ")+ln,isu))

def draw():
    kd.fill_rect(0,0,W,CHAT_H,WHITE)
    for i,(ln,isu) in enumerate(_log[-MAX_LINES:]):
        kd.draw_string(ln[:LC],0,i*FH,BLUE if isu else BLACK,WHITE)
    kd.fill_rect(0,CHAT_H,W,2,DIV)
    kd.fill_rect(0,CHAT_H+2,W,BAR_H-2,GREY)
    kd.draw_string("> Type & OK | bye=quit",0,CHAT_H+4,DKG,GREY)

push("Bot","Hi! Ask me anything.",False)
draw()

while True:
    t=input()
    if not t or not t.strip():continue
    t=t.strip()
    push("You",t,True)
    draw()
    push("Bot",match(t),False)
    draw()
    if any(w in t.lower() for w in("bye","quit","exit")):break

kd.fill_rect(0,0,W,H,GREY)
kd.draw_string("Goodbye! Good luck!",10,H//2,BLACK,GREY)
