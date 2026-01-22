
/* Tournée V7 — géocodage + ordre par distance à la mairie
   - Géocode "Mairie <Ville>" (cache local)
   - Géocode chaque adresse à l'ajout / modification
   - Bouton "Optimiser" : géocode les manquantes (avec biais autour de la mairie) + trie
*/
const INITIAL_DATA = {"Alénya":[{"street":"16 Avenue de Perpignan","postcode":"66200","city":"Alénya","done":false}],"Argelès-sur-Mer":[{"street":"2 Rue André Malraux","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"5 BIS Rue Frédéric Mistral","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"5 Impasse Edmond Brazes","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"5 Rue des Timoniers","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"5 Rue Frédéric Mistral","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"5 Rue Simona Gay","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"6 Rue Claude Salvy","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"9 Impasse. des Huppes","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"9 Place. Raimond de Tatzó","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"10 Rue de la Concorde","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"10 Rue du Vercors","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"10 Rue Jean Jacques Rousseau","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"11 Rue Bernard Berenger","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"12 Rue de Bel Air","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"14 Rue Paul Claudel","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"25 Avenue Molière","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"58 Rue Jean Moulin","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"78 BIS Avenue du 8 Mai 1945","postcode":"66700","city":"Argelès-sur-Mer","done":false},{"street":"755 Avenue du Tech","postcode":"66700","city":"Argelès-sur-Mer","done":false}],"Bages":[{"street":"2 Rue André Chénier","postcode":"66670","city":"Bages","done":false},{"street":"7 Rue François Arago","postcode":"66670","city":"Bages","done":false}],"Baho":[{"street":"16 Rue Neuve","postcode":"66540","city":"Baho","done":false},{"street":"17 Rue des Eaux Vives","postcode":"66540","city":"Baho","done":false},{"street":"17 Rue des Eaux Vives Baho","postcode":"66540","city":"Baho","done":false},{"street":"17 Rue du Pardal","postcode":"66540","city":"Baho","done":false},{"street":"56 Avenue des Pyrénées","postcode":"66540","city":"Baho","done":false}],"Baixas":[{"street":"2 Impasse du Bail","postcode":"66390","city":"Baixas","done":false},{"street":"47 Rue Dom. Brial","postcode":"66390","city":"Baixas","done":false}],"Banyuls-dels-Aspres":[{"street":"3 Rue du Canigou","postcode":"66300","city":"Banyuls-dels-Aspres","done":false},{"street":"4 Rue des Alberes","postcode":"66300","city":"Banyuls-dels-Aspres","done":false}],"Bompas":[{"street":"2 Rue Saint Etienne","postcode":"66430","city":"Bompas","done":false},{"street":"2 Rue St Etienne","postcode":"66430","city":"Bompas","done":false},{"street":"4 Avenue des Olivier","postcode":"66430","city":"Bompas","done":false},{"street":"4 Avenue des Oliviers","postcode":"66430","city":"Bompas","done":false},{"street":"5 Rue Henri Salvador","postcode":"66430","city":"Bompas","done":false},{"street":"13 Rue de Paradis","postcode":"66430","city":"Bompas","done":false},{"street":"18 Rue de Bretagne","postcode":"66430","city":"Bompas","done":false},{"street":"24 Avenue du Haut Vernet","postcode":"66430","city":"Bompas","done":false},{"street":"25 Avenue de la Tet","postcode":"66430","city":"Bompas","done":false},{"street":"27 Rue Marechal Foch","postcode":"66430","city":"Bompas","done":false},{"street":"50 Avenue de la Salanque","postcode":"66430","city":"Bompas","done":false},{"street":"1150 Chemin de Charlemagne","postcode":"66430","city":"Bompas","done":false}],"Brouilla":[{"street":"4 Rue de la Tramontane","postcode":"66200","city":"Brouilla","done":false}],"Cabestany":[{"street":"1 Rue du Comité de Baixas","postcode":"66100","city":"Cabestany","done":false},{"street":"3 Rue Georges Clemenceau","postcode":"66330","city":"Cabestany","done":false},{"street":"9 Rue du 17ème Régiment d'infanterie","postcode":"66330","city":"Cabestany","done":false},{"street":"12 BIS Cours Raymond de Miraval","postcode":"66330","city":"Cabestany","done":false},{"street":"14 Rue des Géraniums","postcode":"66330","city":"Cabestany","done":false},{"street":"15 Rue Fernand Grenier","postcode":"66330","city":"Cabestany","done":false},{"street":"17 Allée du Comité de Baixas","postcode":"66330","city":"Cabestany","done":false},{"street":"17 Rue du Muscat","postcode":"66330","city":"Cabestany","done":false},{"street":"23 Rue Edouart Vaillant","postcode":"66330","city":"Cabestany","done":false},{"street":"27 Avenue de Provence","postcode":"66330","city":"Cabestany","done":false},{"street":"38 Rue Fernand Grenier","postcode":"66330","city":"Cabestany","done":false}],"Canet-en-Roussillon":[{"street":"1 Rue de la Liberté","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"1 Rue du Danemark","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"1 Rue du Danemark et de Suisse","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"1 Rue Île de France","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"3 Avenue. de Toulouse","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"3 Rue D’italie","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"8 Avenue des Haut de Canet","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"11 Impasse. Hyacinthe Rigaud","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"12 Rue Déodat de Sévérac","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"14 Rue du Pressoir","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"15 Rue des Roses","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"16 Avenue Guy Drut Clap Cine","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"18 Impasse. du Lion","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"25 Boulevard de la Jetee","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"28 Avenue. de Catalogne","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"31 Avenue. de Capestang","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"34 Boulevards Tixador","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"34BIS Avenue des Floralies","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"41 Promenade. de la Côte Vermeille","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"46 Rue de la Marinade","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"46 Rue de la Marinade","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"48 Avenue des Coteaux","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"72 Avenue des Côteaux","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"104 Promenade. de la Côte Vermeille","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"140 Avenue des Hauts de Canet","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"141 Avenue de Haut de Canet","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"142 Avenue des Hauts de Canet Malibu","postcode":"66140","city":"Canet-en-Roussillon","done":false},{"street":"6 Avenue Sauvy","postcode":"66240","city":"Canet-en-Roussillon","done":false}],"Canohès":[{"street":"13 Rue Auguste Estrade","postcode":"66000","city":"Canohès","done":false},{"street":"1 Rue Éliane Thibault Comelade","postcode":"66680","city":"Canohès","done":false},{"street":"1 Rue Salvador Dali","postcode":"66680","city":"Canohès","done":false},{"street":"2 Impasse. Joseph Sebastia Pons","postcode":"66680","city":"Canohès","done":false},{"street":"2 Rue des Vignes","postcode":"66680","city":"Canohès","done":false},{"street":"3 Rue des Mimosas","postcode":"66680","city":"Canohès","done":false},{"street":"5TER Rue de la Pourtalade","postcode":"66680","city":"Canohès","done":false},{"street":"8 Avenue. El Crusat","postcode":"66680","city":"Canohès","done":false},{"street":"8 Rue Edmond Brazes","postcode":"66680","city":"Canohès","done":false},{"street":"10 Rue de la Poste","postcode":"66680","city":"Canohès","done":false},{"street":"10 Rue du 11 Novembre","postcode":"66680","city":"Canohès","done":false},{"street":"12 Rue Pompeu Fabra","postcode":"66680","city":"Canohès","done":false}],"Cases-de-Pène":[{"street":"6 Traverse de Baixas","postcode":"66600","city":"Cases-de-Pène","done":false}],"Claira":[{"street":"8 Rue Maréchal Joffre","postcode":"66530","city":"Claira","done":false},{"street":"9 Rue Saint Maurice","postcode":"66530","city":"Claira","done":false},{"street":"9 Rue St Maurice","postcode":"66530","city":"Claira","done":false},{"street":"14 Rue Charles Trenet","postcode":"66530","city":"Claira","done":false},{"street":"14 Rue Saint Narcisses","postcode":"66530","city":"Claira","done":false},{"street":"19 Rue Claudie Haignere","postcode":"66530","city":"Claira","done":false},{"street":"21 Rue Hélène Boucher","postcode":"66530","city":"Claira","done":false},{"street":"22 Rue de l'anguille","postcode":"66530","city":"Claira","done":false},{"street":"38 Chemin du Mas Bordas","postcode":"66530","city":"Claira","done":false},{"street":"38 Chemin du Mas Bordas Maison 16 E","postcode":"66530","city":"Claira","done":false},{"street":"38 Chemin du Mas Bordas Maison 16e","postcode":"66530","city":"Claira","done":false},{"street":"38 Chemin du Mas Bordas Maison 16e 66530 Claira","postcode":"66530","city":"Claira","done":false}],"Collioure":[{"street":"2 Rue du Puit Saint Dominique","postcode":"66190","city":"Collioure","done":false}],"Corneilla-del-Vercol":[{"street":"3 Rue des Lauriers","postcode":"66200","city":"Corneilla-del-Vercol","done":false},{"street":"4 Rue Simone de Beauvoir","postcode":"66200","city":"Corneilla-del-Vercol","done":false},{"street":"8 Allée du Canigou","postcode":"66200","city":"Corneilla-del-Vercol","done":false}],"Corneilla-La-Rivière":[{"street":"113 Nord Route Nationale","postcode":"66550","city":"Corneilla-La-Rivière","done":false},{"street":"113 Route Nationale","postcode":"66550","city":"Corneilla-La-Rivière","done":false}],"Elne":[{"street":"1 Rue Josep de la Trinxeria","postcode":"66200","city":"Elne","done":false},{"street":"2 Rue du Colonel Arnaud Beltram","postcode":"66200","city":"Elne","done":false},{"street":"3 Blvd du Passage de la Baneta","postcode":"66200","city":"Elne","done":false},{"street":"4 Rue du Conflent","postcode":"66200","city":"Elne","done":false},{"street":"6 Rue du Moulin","postcode":"66200","city":"Elne","done":false},{"street":"8 Route National","postcode":"66200","city":"Elne","done":false},{"street":"10 Rue de la Chicane","postcode":"66200","city":"Elne","done":false},{"street":"10 Rue de la Gendarmerie","postcode":"66200","city":"Elne","done":false},{"street":"16 Rue Georges Brassens","postcode":"66200","city":"Elne","done":false},{"street":"16 Rue Joseph Planes","postcode":"66200","city":"Elne","done":false},{"street":"28 Rue de la Gangue","postcode":"66200","city":"Elne","done":false},{"street":"35 Rue Rosa Paks","postcode":"66200","city":"Elne","done":false},{"street":"35 Rue Rosa Parks","postcode":"66200","city":"Elne","done":false}],"Espira-de-l'Agly":[{"street":"3BIS Rue Pasteur Impasse Rouget de l'isle","postcode":"66600","city":"Espira-de-l'Agly","done":false},{"street":"4 Rue Ull de la Mola","postcode":"66600","city":"Espira-de-l'Agly","done":false},{"street":"6 Rue du Dr Coste","postcode":"66600","city":"Espira-de-l'Agly","done":false},{"street":"11 Rue du Quatorze Juillet","postcode":"66600","city":"Espira-de-l'Agly","done":false}],"Fourques":[{"street":"5 Carrer Gran","postcode":"66300","city":"Fourques","done":false}],"Latour-Bas-Elne":[{"street":"1 Rue de la Tramontane","postcode":"66200","city":"Latour-Bas-Elne","done":false},{"street":"1 Rue du Carignan","postcode":"66200","city":"Latour-Bas-Elne","done":false},{"street":"10 Rue de la Poste","postcode":"66200","city":"Latour-Bas-Elne","done":false},{"street":"17 Rue Saint-pierre","postcode":"66200","city":"Latour-Bas-Elne","done":false},{"street":"18 Rue du Grenache","postcode":"66200","city":"Latour-Bas-Elne","done":false},{"street":"22 Avenue. de Saint-cyprien","postcode":"66200","city":"Latour-Bas-Elne","done":false},{"street":"30 Rue de la Tramontane","postcode":"66200","city":"Latour-Bas-Elne","done":false}],"Le Barcarès":[{"street":"2 Impasse. des Petits Loups","postcode":"66420","city":"Le Barcarès","done":false},{"street":"3 Avenue. du Racou","postcode":"66420","city":"Le Barcarès","done":false},{"street":"5 Avenue. des Dosses","postcode":"66420","city":"Le Barcarès","done":false},{"street":"5 Avenue. Dominica","postcode":"66420","city":"Le Barcarès","done":false},{"street":"10 Rue du Mas de la Grêle","postcode":"66420","city":"Le Barcarès","done":false},{"street":"12 Quai des Pyrénées","postcode":"66420","city":"Le Barcarès","done":false},{"street":"36 Rue des Lamparos","postcode":"66420","city":"Le Barcarès","done":false},{"street":"111 Boulevard du 14 Juillet","postcode":"66420","city":"Le Barcarès","done":false}],"Le Soler":[{"street":"13 Rue Marechal Joffre","postcode":"66170","city":"Le Soler","done":false},{"street":"2 Rue des Genévriers","postcode":"66270","city":"Le Soler","done":false},{"street":"4 Rue Joan Cayrol","postcode":"66270","city":"Le Soler","done":false},{"street":"8 Rue Albert Bausil","postcode":"66270","city":"Le Soler","done":false},{"street":"13 Rue du Maréchal Joffre","postcode":"66270","city":"Le Soler","done":false},{"street":"13 Rue Marechal Joffre","postcode":"66270","city":"Le Soler","done":false},{"street":"15 Rue Léon Blum","postcode":"66270","city":"Le Soler","done":false},{"street":"23 Rue des Ormes","postcode":"66270","city":"Le Soler","done":false},{"street":"35 Rue du Conflent","postcode":"66270","city":"Le Soler","done":false},{"street":"61 Avenue Jean Jaures","postcode":"66270","city":"Le Soler","done":false}],"Llupia":[{"street":"4 Rue de la Têt","postcode":"66300","city":"Llupia","done":false}],"Millas":[{"street":"3 Rue Jean Bourrat","postcode":"66170","city":"Millas","done":false},{"street":"26 Carrer Del Rec","postcode":"66170","city":"Millas","done":false},{"street":"64 Avenue. Jean Jaurès","postcode":"66170","city":"Millas","done":false}],"Perpignan":[{"street":"1 Allée Jose Maria de Heredia","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Avenue du Docteur Torreill","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Avenue. du Général de Gaulle","postcode":"66000","city":"Perpignan","done":false},{"street":"1 BIS Place Justin Bardou Job","postcode":"66000","city":"Perpignan","done":false},{"street":"1 BIS Rue du Figuier","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Impasse Marivaux","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Rue Alain Lesage","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Rue Claude Clodion","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Rue des Commeres","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Rue des Glaieuls","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Rue des Œillets","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Rue François Delcos","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Rue Henri Fantin Latour","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Rue Henri Verneuil","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Rue Simone Gay","postcode":"66000","city":"Perpignan","done":false},{"street":"02 Rue Fabriques d'en Nabot","postcode":"66000","city":"Perpignan","done":false},{"street":"2 BIS Rue Porte D’assaut","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Boulevard Clemenceau","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Boulevard Georges Clemenceau","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Cours Lazare Escarguel","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Cours Palmarole","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue Abbe Albert Cazes","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue des Frères Rosny","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue du Lieutenant Farriol","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue Général Labedoyer","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue Jean de la Fontaine","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue Jules Dumont d'urville","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue Louis le Vau","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue Marché au Bestiaux","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue Pascal Marie Agasse","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue Prte d'assaut","postcode":"66000","city":"Perpignan","done":false},{"street":"2 Rue Zenobe Gramme","postcode":"66000","city":"Perpignan","done":false},{"street":"3 et 5 Rue Paul Morand","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Frédéric Bartholdi","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Impasse de la Houle","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Rue Anny de Pous","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Rue Bonaventura Carlos Aribaud","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Rue des Augustins","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Rue Henri","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Rue Jean Payra","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Rue Jean Philippe Rameau","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Rue Jordi Carbonell I Tries","postcode":"66000","city":"Perpignan","done":false},{"street":"3 Rue Luc Dagobert","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Impasse. de Setcases","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Impasse du Setcas","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Impasse du Setcasse","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Impasse du Setecass","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue Antoine de Condorcet","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue de Latour Bas Elne","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue Eugène Flachat","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue Gustave Effel","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue Gustave Eiffel","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue la Petite Real","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue Neuve","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue Paul Séjourné","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue Robert Planquette","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue Sainte-magdeleine","postcode":"66000","city":"Perpignan","done":false},{"street":"4 Rue Yves Allégret","postcode":"66000","city":"Perpignan","done":false},{"street":"5 Avenue du Parc des Expositions","postcode":"66000","city":"Perpignan","done":false},{"street":"5 Place. Alain Gerbault","postcode":"66000","city":"Perpignan","done":false},{"street":"5 Rue Alain Gerbault","postcode":"66000","city":"Perpignan","done":false},{"street":"5 Rue de la Révolution Française","postcode":"66000","city":"Perpignan","done":false},{"street":"5 Rue des Sérénade","postcode":"66000","city":"Perpignan","done":false},{"street":"5 Rue des Tuileries","postcode":"66000","city":"Perpignan","done":false},{"street":"5 Rue du Tuileries","postcode":"66000","city":"Perpignan","done":false},{"street":"5 Rue Michel de Montaigne","postcode":"66000","city":"Perpignan","done":false},{"street":"5 Rue Paul Morand Perpignan","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Avenue Docteur Jean Louis Torreille","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Avenue Dr Jean Louis Torreilles","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Avenue. Rosette Blanc","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Boulevard du Roussillon","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Impasse Ducup","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Impasse Ducup de Saint-paul","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Rie Pierre de Montreuil","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Rue de la Corse","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Rue du Cygne","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Rue du Puyvalador","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Rue Jean Baptiste Chardin","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Rue Petite la Real","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Rue Pierre de Montreuil","postcode":"66000","city":"Perpignan","done":false},{"street":"6 Rue Stendhal","postcode":"66000","city":"Perpignan","done":false},{"street":"7 Rue Charles de Montesquieu","postcode":"66000","city":"Perpignan","done":false},{"street":"7 Rue de la Main de Fer","postcode":"66000","city":"Perpignan","done":false},{"street":"7 Rue de Leglise la Real","postcode":"66000","city":"Perpignan","done":false},{"street":"7 Rue de Venise","postcode":"66000","city":"Perpignan","done":false},{"street":"7 Rue de Vienne","postcode":"66000","city":"Perpignan","done":false},{"street":"7 Rue Mercè Rodoreda","postcode":"66000","city":"Perpignan","done":false},{"street":"7 Rue Raymond Pitet","postcode":"66000","city":"Perpignan","done":false},{"street":"8 Avenue de Grande Bretagne","postcode":"66000","city":"Perpignan","done":false},{"street":"8 Avenue Joe Rosenthal","postcode":"66000","city":"Perpignan","done":false},{"street":"8 Rue de la Cloche d'or","postcode":"66000","city":"Perpignan","done":false},{"street":"8 Rue des Rouges Gorges","postcode":"66000","city":"Perpignan","done":false},{"street":"8 Rue du Chantier","postcode":"66000","city":"Perpignan","done":false},{"street":"8 Rue Élie Delcros","postcode":"66000","city":"Perpignan","done":false},{"street":"8 Rue Jules Romains","postcode":"66000","city":"Perpignan","done":false},{"street":"8 Rue Saint-françois de Paule","postcode":"66000","city":"Perpignan","done":false},{"street":"8 Rue Santiago Russinol","postcode":"66000","city":"Perpignan","done":false},{"street":"9 Boulevard Kenedy Perpignan","postcode":"66000","city":"Perpignan","done":false},{"street":"9 Jean Baptiste Greuse","postcode":"66000","city":"Perpignan","done":false},{"street":"9 Rue Charles Guerhardt","postcode":"66000","city":"Perpignan","done":false},{"street":"9 Rue Commandant Ernest Soubielle","postcode":"66000","city":"Perpignan","done":false},{"street":"9 Rue Edouard Bourdet","postcode":"66000","city":"Perpignan","done":false},{"street":"9 Rue Henry Aragon","postcode":"66000","city":"Perpignan","done":false},{"street":"9 Rue Jean Racine","postcode":"66000","city":"Perpignan","done":false},{"street":"10 Boulevard du Roussillon","postcode":"66000","city":"Perpignan","done":false},{"street":"10 Résidence des 4 Cazals","postcode":"66000","city":"Perpignan","done":false},{"street":"10 Rue Grande la Réal","postcode":"66000","city":"Perpignan","done":false},{"street":"10 Rue Honoré de Balzac","postcode":"66000","city":"Perpignan","done":false},{"street":"10 Rue Louis de Bonnefoy","postcode":"66000","city":"Perpignan","done":false},{"street":"11 Avenue. de Grande Bretagne","postcode":"66000","city":"Perpignan","done":false},{"street":"11 Avenue Marcelin Albert","postcode":"66000","city":"Perpignan","done":false},{"street":"11 Avenue Ribere","postcode":"66000","city":"Perpignan","done":false},{"street":"11 Rue de la Tour de la Massane","postcode":"66000","city":"Perpignan","done":false},{"street":"12 Rue Adolphe Monticelli","postcode":"66000","city":"Perpignan","done":false},{"street":"12 Rue Alphonse Simon","postcode":"66000","city":"Perpignan","done":false},{"street":"12 Rue Claude Bernard","postcode":"66000","city":"Perpignan","done":false},{"street":"12 Rue du Fer À Cheval","postcode":"66000","city":"Perpignan","done":false},{"street":"12 Rue Grande la Réal","postcode":"66000","city":"Perpignan","done":false},{"street":"12 Rue Madame de Staël","postcode":"66000","city":"Perpignan","done":false},{"street":"12 Rue Noël Coypel","postcode":"66000","city":"Perpignan","done":false},{"street":"12 Rue Pompeu Fabra","postcode":"66000","city":"Perpignan","done":false},{"street":"13 Rue de Cadaques","postcode":"66000","city":"Perpignan","done":false},{"street":"13 Rue Paul Riquet","postcode":"66000","city":"Perpignan","done":false},{"street":"13 Rue Petite la Monnaie","postcode":"66000","city":"Perpignan","done":false},{"street":"14 Chemin. du Sacré Cœur","postcode":"66000","city":"Perpignan","done":false},{"street":"14 Impasse Alphonse Daudet","postcode":"66000","city":"Perpignan","done":false},{"street":"14 Rue de Valencia","postcode":"66000","city":"Perpignan","done":false},{"street":"14 Rue Gabriel Fauré","postcode":"66000","city":"Perpignan","done":false},{"street":"14 Rue Henri Fantin Latour","postcode":"66000","city":"Perpignan","done":false},{"street":"15 All. de Bacchus","postcode":"66000","city":"Perpignan","done":false},{"street":"15 Avenue. Marcel Aime","postcode":"66000","city":"Perpignan","done":false},{"street":"15 Rue du Général Legrand","postcode":"66000","city":"Perpignan","done":false},{"street":"15 Rue General Legrand","postcode":"66000","city":"Perpignan","done":false},{"street":"15 Rue Jacques Mach","postcode":"66000","city":"Perpignan","done":false},{"street":"16 Rue Benoît Fourneyron","postcode":"66000","city":"Perpignan","done":false},{"street":"16 Rue Ernest Hemingway","postcode":"66000","city":"Perpignan","done":false},{"street":"16 Rue Hyacinte Rigaud","postcode":"66000","city":"Perpignan","done":false},{"street":"16 Rue Jean de la Fontaine","postcode":"66000","city":"Perpignan","done":false},{"street":"16 Rue Stendhal","postcode":"66000","city":"Perpignan","done":false},{"street":"17 Rue Floréal St Assicle","postcode":"66000","city":"Perpignan","done":false},{"street":"17 Rue Luc de Vauvenargues","postcode":"66000","city":"Perpignan","done":false},{"street":"17 Rue Marc Seguin","postcode":"66000","city":"Perpignan","done":false},{"street":"18 Avenue de Prades","postcode":"66000","city":"Perpignan","done":false},{"street":"18 Boulevard Georges Clémenceau","postcode":"66000","city":"Perpignan","done":false},{"street":"18 Rue Grande la Monnaie","postcode":"66000","city":"Perpignan","done":false},{"street":"18 Rue Léo Delibes","postcode":"66000","city":"Perpignan","done":false},{"street":"19 Rue Aristide Maillol","postcode":"66000","city":"Perpignan","done":false},{"street":"19 Rue Honoré de Balzac","postcode":"66000","city":"Perpignan","done":false},{"street":"19 Rue Sébastien Vauban","postcode":"66000","city":"Perpignan","done":false},{"street":"20 Espace Méditerrané","postcode":"66000","city":"Perpignan","done":false},{"street":"20 Rue Pascal Marie Agasse","postcode":"66000","city":"Perpignan","done":false},{"street":"20 Rue René Leriche","postcode":"66000","city":"Perpignan","done":false},{"street":"21 Avenue Joffre","postcode":"66000","city":"Perpignan","done":false},{"street":"21 Esplanade Méditerranée","postcode":"66000","city":"Perpignan","done":false},{"street":"21 Rue des Augustins","postcode":"66000","city":"Perpignan","done":false},{"street":"21 Rue des Jeunes Années","postcode":"66000","city":"Perpignan","done":false},{"street":"21 Rue Grande la Monnaie","postcode":"66000","city":"Perpignan","done":false},{"street":"22 Rue Petite la Réal","postcode":"66000","city":"Perpignan","done":false},{"street":"23 Rue des Vignes","postcode":"66000","city":"Perpignan","done":false},{"street":"23 Rue Jean Michel Chevotet","postcode":"66000","city":"Perpignan","done":false},{"street":"23 Rue Vincente Blasco Ibanez","postcode":"66000","city":"Perpignan","done":false},{"street":"24 Avenue de Cerdagne","postcode":"66000","city":"Perpignan","done":false},{"street":"24 Avenue. Emile Roudayre","postcode":"66000","city":"Perpignan","done":false},{"street":"24 Cours Lazare Escarguel","postcode":"66000","city":"Perpignan","done":false},{"street":"24 Rue de Cerdagne","postcode":"66000","city":"Perpignan","done":false},{"street":"24 Rue Theodore Chasseriau","postcode":"66000","city":"Perpignan","done":false},{"street":"24 Rue Valentin Magnan","postcode":"66000","city":"Perpignan","done":false},{"street":"25 Carrer Alexandre Josep Oliva","postcode":"66000","city":"Perpignan","done":false},{"street":"25 Quai Vauban","postcode":"66000","city":"Perpignan","done":false},{"street":"25 Rue de Paris","postcode":"66000","city":"Perpignan","done":false},{"street":"25 Rue Nicolas Poussin","postcode":"66000","city":"Perpignan","done":false},{"street":"26 Avenue Alfred Sauvy (cité Universitaire Côté Pente)","postcode":"66000","city":"Perpignan","done":false},{"street":"26 Rue de la Tour de la Massane","postcode":"66000","city":"Perpignan","done":false},{"street":"26 Rue des Trois Journées","postcode":"66000","city":"Perpignan","done":false},{"street":"26 Rue Joseph Cabrit","postcode":"66000","city":"Perpignan","done":false},{"street":"27 Rue Georges Bizet","postcode":"66000","city":"Perpignan","done":false},{"street":"28 Rue des Metezeau","postcode":"66000","city":"Perpignan","done":false},{"street":"29 Rue de Venise","postcode":"66000","city":"Perpignan","done":false},{"street":"29 Rue Pascal Marie Agasse","postcode":"66000","city":"Perpignan","done":false},{"street":"32 Boulevard John-fitzgerald Kennedy","postcode":"66000","city":"Perpignan","done":false},{"street":"32 Place Hyacinthe Rigaud","postcode":"66000","city":"Perpignan","done":false},{"street":"32 Rue Jacques Trefouel","postcode":"66000","city":"Perpignan","done":false},{"street":"33 Rue des Amandiers","postcode":"66000","city":"Perpignan","done":false},{"street":"34 Avenue Général Leclerc","postcode":"66000","city":"Perpignan","done":false},{"street":"35 Rue Alfred Bachelet","postcode":"66000","city":"Perpignan","done":false},{"street":"35 Rue Grande la Réal","postcode":"66000","city":"Perpignan","done":false},{"street":"36 Rue Charles Gerhardt","postcode":"66000","city":"Perpignan","done":false},{"street":"37 Rue Grande la Réal","postcode":"66000","city":"Perpignan","done":false},{"street":"38 Rue Jean Alcover","postcode":"66000","city":"Perpignan","done":false},{"street":"38BIS Rue Jean Alcover","postcode":"66000","city":"Perpignan","done":false},{"street":"40 Avenue. des Eaux Vives","postcode":"66000","city":"Perpignan","done":false},{"street":"40 Rue Cabrit","postcode":"66000","city":"Perpignan","done":false},{"street":"41 Boulevard John Fitzgerald Kennedy","postcode":"66000","city":"Perpignan","done":false},{"street":"41 Rambla de l'occitanie","postcode":"66000","city":"Perpignan","done":false},{"street":"41 Rue Han Coll","postcode":"66000","city":"Perpignan","done":false},{"street":"44 Avenue du Palais des Expositions","postcode":"66000","city":"Perpignan","done":false},{"street":"44 Rue André Chouraqui","postcode":"66000","city":"Perpignan","done":false},{"street":"45 Rue Auguste Mariette","postcode":"66000","city":"Perpignan","done":false},{"street":"47 Rue de l'emporda","postcode":"66000","city":"Perpignan","done":false},{"street":"47 Rue René Antoine de Réaumur","postcode":"66000","city":"Perpignan","done":false},{"street":"51 Avenue du Palais des Expositions","postcode":"66000","city":"Perpignan","done":false},{"street":"52 BIS Boulevard Aristide Briand","postcode":"66000","city":"Perpignan","done":false},{"street":"56 Boulevard Aristide Briand","postcode":"66000","city":"Perpignan","done":false},{"street":"57 Avenue du Général de Gaulle","postcode":"66000","city":"Perpignan","done":false},{"street":"59 Rue Alexandre Ansaldi","postcode":"66000","city":"Perpignan","done":false},{"street":"61 Avenue du Comdant Soubielle","postcode":"66000","city":"Perpignan","done":false},{"street":"61 Avenue du Commandant Ernest Soubielle","postcode":"66000","city":"Perpignan","done":false},{"street":"61 Rue Jean","postcode":"66000","city":"Perpignan","done":false},{"street":"61 Rue Jean Baptiste Lulli","postcode":"66000","city":"Perpignan","done":false},{"street":"64 Avenue Jean Giono","postcode":"66000","city":"Perpignan","done":false},{"street":"66 Avenue du Champ de Mars","postcode":"66000","city":"Perpignan","done":false},{"street":"67 All. des Cyprès","postcode":"66000","city":"Perpignan","done":false},{"street":"69 Rue Alexandre Ansaldi","postcode":"66000","city":"Perpignan","done":false},{"street":"71 Rue Joan Maragall","postcode":"66000","city":"Perpignan","done":false},{"street":"73 Avenue du Docteur Albert Schweitzer","postcode":"66000","city":"Perpignan","done":false},{"street":"85 Chemin. de la Poudrière","postcode":"66000","city":"Perpignan","done":false},{"street":"91 Rue Pascal Marie Grasse","postcode":"66000","city":"Perpignan","done":false},{"street":"92 Avenue. Commandant Ernest Soubielle","postcode":"66000","city":"Perpignan","done":false},{"street":"97 Avenue. de Prades","postcode":"66000","city":"Perpignan","done":false},{"street":"99 Avenue Docteur Albert Schweitzer","postcode":"66000","city":"Perpignan","done":false},{"street":"109 Rue Jean Bullant","postcode":"66000","city":"Perpignan","done":false},{"street":"140 Avenue. du Palais des Expositions","postcode":"66000","city":"Perpignan","done":false},{"street":"141BIS Avenue Maréchal Joffre","postcode":"66000","city":"Perpignan","done":false},{"street":"146 Avenue Maréchal Joffre","postcode":"66000","city":"Perpignan","done":false},{"street":"183 Avenue de Maréchal Joffre","postcode":"66000","city":"Perpignan","done":false},{"street":"193 Avenue Abbé Pierre Perpignan","postcode":"66000","city":"Perpignan","done":false},{"street":"200 Cami Joan Biosca","postcode":"66000","city":"Perpignan","done":false},{"street":"280 Chemin du Mas Ducp","postcode":"66000","city":"Perpignan","done":false},{"street":"300 Avenue Charles Deperet","postcode":"66000","city":"Perpignan","done":false},{"street":"308 Chemin. du Mas Bresson","postcode":"66000","city":"Perpignan","done":false},{"street":"350 Chemin de Château Roussillon","postcode":"66000","city":"Perpignan","done":false},{"street":"358 Chemin. du Mas Ducup","postcode":"66000","city":"Perpignan","done":false},{"street":"807 Chemin de Soleil Roi","postcode":"66000","city":"Perpignan","done":false},{"street":"807 Chemin. du Soleil Roy","postcode":"66000","city":"Perpignan","done":false},{"street":"817 Boulevard Marius Berlier","postcode":"66000","city":"Perpignan","done":false},{"street":"955 Avenue. Julien Panchot","postcode":"66000","city":"Perpignan","done":false},{"street":"1098 Avenue Eole Tecnosud 2","postcode":"66000","city":"Perpignan","done":false},{"street":"1 Avenue. de Banyuls-sur-mer","postcode":"66100","city":"Perpignan","done":false},{"street":"1 Rue de la Preste","postcode":"66100","city":"Perpignan","done":false},{"street":"1 Rue des Ardennes","postcode":"66100","city":"Perpignan","done":false},{"street":"2 Avenue. du Cap Béar","postcode":"66100","city":"Perpignan","done":false},{"street":"2 Rue des Terrasses","postcode":"66100","city":"Perpignan","done":false},{"street":"2 Rue François Broussais","postcode":"66100","city":"Perpignan","done":false},{"street":"3 Rond-point du Parc des Sports","postcode":"66100","city":"Perpignan","done":false},{"street":"3 Rue de Corneilla Del Vercol","postcode":"66100","city":"Perpignan","done":false},{"street":"3 Rue Paul Morand","postcode":"66100","city":"Perpignan","done":false},{"street":"4 Avenue d'amélie les Bains","postcode":"66100","city":"Perpignan","done":false},{"street":"4 Avenue. Robert Emmanuel Brousse","postcode":"66100","city":"Perpignan","done":false},{"street":"4 Rue des Ardennes Perpignan","postcode":"66100","city":"Perpignan","done":false},{"street":"4 Rue des Trabucayres","postcode":"66100","city":"Perpignan","done":false},{"street":"4 Rue Neuve","postcode":"66100","city":"Perpignan","done":false},{"street":"5 Place. Charles Hermite","postcode":"66100","city":"Perpignan","done":false},{"street":"5 Rue Jeanne Jugan","postcode":"66100","city":"Perpignan","done":false},{"street":"5 Rue Notre Dame du Coral","postcode":"66100","city":"Perpignan","done":false},{"street":"6 Avenue de la Côté Radieuse","postcode":"66100","city":"Perpignan","done":false},{"street":"6 Rue du Pas du Loup","postcode":"66100","city":"Perpignan","done":false},{"street":"8 Avenue Pierre Cambres","postcode":"66100","city":"Perpignan","done":false},{"street":"8 Boulevard Henri Poincaré","postcode":"66100","city":"Perpignan","done":false},{"street":"8 Rue des Dragons","postcode":"66100","city":"Perpignan","done":false},{"street":"10 Rambla de l'occitanie","postcode":"66100","city":"Perpignan","done":false},{"street":"10 Rue du Vilar","postcode":"66100","city":"Perpignan","done":false},{"street":"10 Rue Gustave Roussy","postcode":"66100","city":"Perpignan","done":false},{"street":"10 Rue Paul Claudel","postcode":"66100","city":"Perpignan","done":false},{"street":"14 Square. Maillol","postcode":"66100","city":"Perpignan","done":false},{"street":"15 Rue de Taulis","postcode":"66100","city":"Perpignan","done":false},{"street":"16 Avenue du Tech","postcode":"66100","city":"Perpignan","done":false},{"street":"16 Rambla de l'occitanieaa","postcode":"66100","city":"Perpignan","done":false},{"street":"17 Rue Henri de Turenne","postcode":"66100","city":"Perpignan","done":false},{"street":"20 Rue René Leriche","postcode":"66100","city":"Perpignan","done":false},{"street":"21 Boulevard Jf Kennedy","postcode":"66100","city":"Perpignan","done":false},{"street":"21 Boulevard John Fitzgérald Kennedy","postcode":"66100","city":"Perpignan","done":false},{"street":"23 Avenue. Paul Alduy","postcode":"66100","city":"Perpignan","done":false},{"street":"24 Chemin de Saint Roch","postcode":"66100","city":"Perpignan","done":false},{"street":"25 Rue de Taulis","postcode":"66100","city":"Perpignan","done":false},{"street":"29 Avenue Paul Alduy","postcode":"66100","city":"Perpignan","done":false},{"street":"29 Rue Grande la Monnaie","postcode":"66100","city":"Perpignan","done":false},{"street":"35 Rue de Taulis","postcode":"66100","city":"Perpignan","done":false},{"street":"41 Boulevard John Fitzgerald Kennedy","postcode":"66100","city":"Perpignan","done":false},{"street":"41 Rue de Taulis","postcode":"66100","city":"Perpignan","done":false},{"street":"43 Rue des Ménestrels","postcode":"66100","city":"Perpignan","done":false},{"street":"44 Rue Andre Chouraqui","postcode":"66100","city":"Perpignan","done":false},{"street":"56 Boulevard Aristide Briand Perpignan","postcode":"66100","city":"Perpignan","done":false},{"street":"63 Chemin. de la Passio Vella","postcode":"66100","city":"Perpignan","done":false},{"street":"64 Avenue Georges Guynemer","postcode":"66100","city":"Perpignan","done":false}],"Perpignan (Fr - )":[{"street":"58 Rue Maurice Barres","postcode":"66000","city":"Perpignan (Fr - )","done":false}],"Peyrestortes":[{"street":"3 Place de la République","postcode":"66600","city":"Peyrestortes","done":false}],"Pezilla La Riviere":[{"street":"4 Rue 11 Novenmère","postcode":"66370","city":"Pezilla La Riviere","done":false},{"street":"4 Rue du 11 Novembre 1918","postcode":"66370","city":"Pezilla La Riviere","done":false},{"street":"26 Rue des Aires","postcode":"66370","city":"Pezilla La Riviere","done":false}],"Pézilla-La-Rivière":[{"street":"5 Rond-point des Kiwis","postcode":"66370","city":"Pézilla-La-Rivière","done":false},{"street":"11 Rue Portal d'amont","postcode":"66370","city":"Pézilla-La-Rivière","done":false},{"street":"15 Rue Portal d'amont","postcode":"66370","city":"Pézilla-La-Rivière","done":false},{"street":"17 Rue Paul Astor","postcode":"66370","city":"Pézilla-La-Rivière","done":false},{"street":"25 Rue de l'égalité","postcode":"66370","city":"Pézilla-La-Rivière","done":false}],"Pia":[{"street":"1 BIS Chemin des Vignes","postcode":"66380","city":"Pia","done":false},{"street":"1 Impasse des Capucines","postcode":"66380","city":"Pia","done":false},{"street":"1 Rue des Iris","postcode":"66380","city":"Pia","done":false},{"street":"1 Rue Iris","postcode":"66380","city":"Pia","done":false},{"street":"2 Rue des Pins","postcode":"66380","city":"Pia","done":false},{"street":"2 Rue Joseph Sébastien Pons","postcode":"66380","city":"Pia","done":false},{"street":"3 Rue des Oranger","postcode":"66380","city":"Pia","done":false},{"street":"4 Rue Louise Michel","postcode":"66380","city":"Pia","done":false},{"street":"5 Rue de Gentianes","postcode":"66380","city":"Pia","done":false},{"street":"6 Rue Costabonne","postcode":"66380","city":"Pia","done":false},{"street":"7 Rue des Cormorans","postcode":"66380","city":"Pia","done":false},{"street":"8 Rue des Citronniers","postcode":"66380","city":"Pia","done":false},{"street":"13 C Rue. du Muscat Ressidence L Aramon","postcode":"66380","city":"Pia","done":false},{"street":"16 Rue du Serpolet","postcode":"66380","city":"Pia","done":false},{"street":"20 Chemin. des Charettes","postcode":"66380","city":"Pia","done":false},{"street":"20 Rue de la Llabanere","postcode":"66380","city":"Pia","done":false},{"street":"25 Rue du Chenin Blanc","postcode":"66380","city":"Pia","done":false},{"street":"25 Rue du Clos des Palmiers","postcode":"66380","city":"Pia","done":false},{"street":"30 Avenue. du Stade","postcode":"66380","city":"Pia","done":false},{"street":"32 Route de Perpignan","postcode":"66380","city":"Pia","done":false},{"street":"42 Chemin de l'étang Long","postcode":"66380","city":"Pia","done":false},{"street":"61 Rue du Clos des Palmiers","postcode":"66380","city":"Pia","done":false},{"street":"90 Chemin. des Vignes","postcode":"66380","city":"Pia","done":false}],"Pollestres":[{"street":"1 Rue Prairial","postcode":"66000","city":"Pollestres","done":false},{"street":"4 Place de L Eglise","postcode":"66000","city":"Pollestres","done":false},{"street":"2 Avenue Laure Manaudou","postcode":"66450","city":"Pollestres","done":false},{"street":"4 Place de L Eglise","postcode":"66450","city":"Pollestres","done":false},{"street":"4 Place de la Eglise","postcode":"66450","city":"Pollestres","done":false},{"street":"7 Allée Felicia Ballanger","postcode":"66450","city":"Pollestres","done":false},{"street":"16 Avenue de Canohes","postcode":"66450","city":"Pollestres","done":false},{"street":"16 Cité le Moulin","postcode":"66450","city":"Pollestres","done":false}],"Ponteilla":[{"street":"2 Rue des Fauvettes","postcode":"66300","city":"Ponteilla","done":false}],"Port Barcarès":[{"street":"9 Avenue de la Grande Plage Apt E12","postcode":"66420","city":"Port Barcarès","done":false}],"Port Vendres":[{"street":"5 Boulevard du 8 Mai 1945","postcode":"66660","city":"Port Vendres","done":false}],"Port-Vendres":[{"street":"5 Boulevard du Huit Mai 1945","postcode":"66660","city":"Port-Vendres","done":false}],"Réz De Chaussee":[{"street":"8 Rue Marceau","postcode":"66600","city":"Réz De Chaussee","done":false}],"Rivesaltes":[{"street":"24 Rue Michel Boher","postcode":"66000","city":"Rivesaltes","done":false},{"street":"2 Rue de L Orphéon","postcode":"66600","city":"Rivesaltes","done":false},{"street":"2 Rue de la République","postcode":"66600","city":"Rivesaltes","done":false},{"street":"3 Rue Ambroise Paré","postcode":"66600","city":"Rivesaltes","done":false},{"street":"4 Rue Edgard Quinet","postcode":"66600","city":"Rivesaltes","done":false},{"street":"7 Avenue Alfred Sauvy","postcode":"66600","city":"Rivesaltes","done":false},{"street":"7 Avenue de Romani","postcode":"66600","city":"Rivesaltes","done":false},{"street":"7 Impasse. de Bruxelles","postcode":"66600","city":"Rivesaltes","done":false},{"street":"9 Avenue Louis Blanc","postcode":"66600","city":"Rivesaltes","done":false},{"street":"10 Rue Danton","postcode":"66600","city":"Rivesaltes","done":false},{"street":"13 Avenue. Gambetta","postcode":"66600","city":"Rivesaltes","done":false},{"street":"18 Impasse. de Bruxelles","postcode":"66600","city":"Rivesaltes","done":false},{"street":"19 Avenue. de la Mourere","postcode":"66600","city":"Rivesaltes","done":false},{"street":"19 Avenue. Louis Blanc","postcode":"66600","city":"Rivesaltes","done":false},{"street":"21 Avenue de Romani","postcode":"66600","city":"Rivesaltes","done":false},{"street":"21 Rue de Romani","postcode":"66600","city":"Rivesaltes","done":false},{"street":"27 Avenue Louis Blanc","postcode":"66600","city":"Rivesaltes","done":false},{"street":"27 Rue Jean Jaurès","postcode":"66600","city":"Rivesaltes","done":false},{"street":"41 Rue du 4 Septembre","postcode":"66600","city":"Rivesaltes","done":false},{"street":"42 Rue de la République","postcode":"66600","city":"Rivesaltes","done":false},{"street":"42 Rue Van Gogh","postcode":"66600","city":"Rivesaltes","done":false}],"Saint Laurent De La Salanque":[{"street":"18 Rue Duquesne","postcode":"66000","city":"Saint Laurent De La Salanque","done":false}],"Saint-André":[{"street":"7 Impasse du Conflent","postcode":"66690","city":"Saint-André","done":false}],"Saint-Cyprien":[{"street":"15 Rue du Docteur Schweitzer","postcode":"66200","city":"Saint-Cyprien","done":false},{"street":"214 Rue de Suede","postcode":"66570","city":"Saint-Cyprien","done":false},{"street":"1 Rue Pierre Mac Orlan","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"2 Impasse. Paul Pégar","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"2 Rue Jean Sébastien Bach","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"4 Rue Gaston Chereau","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"5 Rue Eugène Delacroix","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"7 Impasse. Jean Bordes","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"8 Rue de Condorcet Ibis","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"10 Rue Condorcet","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"10 Rue Guillaume Appolinaire","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"12 Rue Sainte-beuve","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"13 Rue Henry Bordeaux","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"14 Quai Arthur Rimbaud","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"15 Boulevard François Desnoyer","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"15 Rue Vaugelas","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"22 Rue Lautréamont","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"27 Avenue Francois Desnoyer","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"28 Avenue. Armand Lanoux","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"30 Place. Henri Bergson","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"39 Rue Docteur Schweitzer","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"39 Rue Docteure Schweitzer","postcode":"66750","city":"Saint-Cyprien","done":false},{"street":"75 Boulevard François Desnoyer","postcode":"66750","city":"Saint-Cyprien","done":false}],"Saint-Estève":[{"street":"1 Rue de la Sardane","postcode":"66240","city":"Saint-Estève","done":false},{"street":"3 Place. Pierre de Coubertin","postcode":"66240","city":"Saint-Estève","done":false},{"street":"5 Rue du Pla Guillem","postcode":"66240","city":"Saint-Estève","done":false},{"street":"10 Rue de Champagne","postcode":"66240","city":"Saint-Estève","done":false},{"street":"14 Route de Perpignan","postcode":"66240","city":"Saint-Estève","done":false},{"street":"15 Rue Olympe de Gouges","postcode":"66240","city":"Saint-Estève","done":false},{"street":"20 Rue de Sydney","postcode":"66240","city":"Saint-Estève","done":false},{"street":"28 BIS Avenue du Général de Gaulle.","postcode":"66240","city":"Saint-Estève","done":false},{"street":"31 Rue François Mitterrand","postcode":"66240","city":"Saint-Estève","done":false},{"street":"38 Avéue Gilbert Brutus","postcode":"66240","city":"Saint-Estève","done":false},{"street":"42 Mas Cot","postcode":"66240","city":"Saint-Estève","done":false},{"street":"42 Rue du Fournas","postcode":"66240","city":"Saint-Estève","done":false},{"street":"55 Boulevard du Canigou","postcode":"66240","city":"Saint-Estève","done":false}],"Saint-Féliu-d'Avall":[{"street":"6 BIS Rue de l'agly","postcode":"66170","city":"Saint-Féliu-d'Avall","done":false},{"street":"7 BIS Impasse de la Côte","postcode":"66170","city":"Saint-Féliu-d'Avall","done":false},{"street":"7 Rue de la Côte","postcode":"66170","city":"Saint-Féliu-d'Avall","done":false},{"street":"11 Rue du Presbytère","postcode":"66170","city":"Saint-Féliu-d'Avall","done":false}],"Saint-Hippolyte":[{"street":"3 Avenue Jeanne d'arc","postcode":"66510","city":"Saint-Hippolyte","done":false},{"street":"12 Rue du 14 Juillet","postcode":"66510","city":"Saint-Hippolyte","done":false}],"Saint-Nazaire":[{"street":"1 Rue du Littoral","postcode":"66570","city":"Saint-Nazaire","done":false},{"street":"12 Rue de l'alicante","postcode":"66570","city":"Saint-Nazaire","done":false}],"Sainte-Marie-la-Mer":[{"street":"1 Rue des Corbières","postcode":"66470","city":"Sainte-Marie-la-Mer","done":false},{"street":"1 Rue Pasteur","postcode":"66470","city":"Sainte-Marie-la-Mer","done":false},{"street":"3 BIS Rue Derrière la Muraille","postcode":"66470","city":"Sainte-Marie-la-Mer","done":false},{"street":"13 Résidence les Ondines","postcode":"66470","city":"Sainte-Marie-la-Mer","done":false},{"street":"17 Rue des Chênes","postcode":"66470","city":"Sainte-Marie-la-Mer","done":false},{"street":"19 Rue des","postcode":"66470","city":"Sainte-Marie-la-Mer","done":false},{"street":"21 Rue des Bougainvilliers","postcode":"66470","city":"Sainte-Marie-la-Mer","done":false},{"street":"36 Rés les Sablettes","postcode":"66470","city":"Sainte-Marie-la-Mer","done":false}],"Saleilles":[{"street":"2 Avenue. Arthur Conte","postcode":"66280","city":"Saleilles","done":false},{"street":"3 Rue de la Serdagne","postcode":"66280","city":"Saleilles","done":false},{"street":"6 Avenue. Gino Massarotto","postcode":"66280","city":"Saleilles","done":false}],"St Marie La Mer":[{"street":"13 Résidence les Ondines","postcode":"66470","city":"St Marie La Mer","done":false}],"Théza":[{"street":"1 Boulevard de l'oratori","postcode":"66200","city":"Théza","done":false},{"street":"7 Rue des Palmiers","postcode":"66200","city":"Théza","done":false},{"street":"11 Rue des Ormes","postcode":"66200","city":"Théza","done":false}],"Thuir":[{"street":"3 Rue du Bélier","postcode":"66300","city":"Thuir","done":false},{"street":"4 Impasse Anatole France","postcode":"66300","city":"Thuir","done":false},{"street":"6 Rue de la Cellera","postcode":"66300","city":"Thuir","done":false},{"street":"7 Avenue des Sports","postcode":"66300","city":"Thuir","done":false},{"street":"11 Rue Albert Bausil","postcode":"66300","city":"Thuir","done":false},{"street":"36 Rue Marcel Pagnol","postcode":"66300","city":"Thuir","done":false}],"Torreilles":[{"street":"1 BIS Avenue des Pyrénées","postcode":"66440","city":"Torreilles","done":false},{"street":"2 Avenue du Languedoc","postcode":"66440","city":"Torreilles","done":false},{"street":"3 BIS Rue George Sand","postcode":"66440","city":"Torreilles","done":false},{"street":"12 Lotissement les Patios","postcode":"66440","city":"Torreilles","done":false},{"street":"12 Rue du Canigou","postcode":"66440","city":"Torreilles","done":false}],"Toulouges":[{"street":"1 Place. de la République","postcode":"66350","city":"Toulouges","done":false},{"street":"3 Eue du Beffroi","postcode":"66350","city":"Toulouges","done":false},{"street":"3 Rue du Beffroi","postcode":"66350","city":"Toulouges","done":false},{"street":"6 Rue Mère Térésa","postcode":"66350","city":"Toulouges","done":false},{"street":"8 Rue du Beffroi","postcode":"66350","city":"Toulouges","done":false},{"street":"44 B Rue de Gerone Res le Pret Catalan 2","postcode":"66350","city":"Toulouges","done":false}],"Tresserre":[{"street":"7 Rue du Canigou","postcode":"66300","city":"Tresserre","done":false}],"Trouillas":[{"street":"2 Rue du Pou de la Pigne","postcode":"66300","city":"Trouillas","done":false},{"street":"15 Rue du Jasmin","postcode":"66300","city":"Trouillas","done":false},{"street":"19 Rue D Alger","postcode":"66300","city":"Trouillas","done":false}],"Villelongue-de-la-Salanque":[{"street":"4 Avenue du Littoral","postcode":"66410","city":"Villelongue-de-la-Salanque","done":false},{"street":"11 Rue","postcode":"66410","city":"Villelongue-de-la-Salanque","done":false},{"street":"12 Rue du Fer À Cheval","postcode":"66410","city":"Villelongue-de-la-Salanque","done":false},{"street":"14 Avenue Perpignan","postcode":"66410","city":"Villelongue-de-la-Salanque","done":false},{"street":"15 Rue des Chardonnerets","postcode":"66410","city":"Villelongue-de-la-Salanque","done":false},{"street":"18 Rue Saint Lucie","postcode":"66410","city":"Villelongue-de-la-Salanque","done":false},{"street":"58 Avenue. du Littoral","postcode":"66410","city":"Villelongue-de-la-Salanque","done":false}],"Villeneuve La Rivière":[{"street":"4 Rue Neuve","postcode":"66000","city":"Villeneuve La Rivière","done":false}],"Villeneuve-de-la-Raho":[{"street":"1 BIS Mas Saint Paul Chemin du Mas Auriol","postcode":"66180","city":"Villeneuve-de-la-Raho","done":false},{"street":"3 Place de la Couloumine","postcode":"66180","city":"Villeneuve-de-la-Raho","done":false},{"street":"5 Rue des Mimosas","postcode":"66180","city":"Villeneuve-de-la-Raho","done":false},{"street":"8 Avenue. Salvador Dali","postcode":"66180","city":"Villeneuve-de-la-Raho","done":false}]};

const LS_KEY = "tournee_v7_data";
const LS_MAIRIES = "tournee_v7_mairies";
const LS_LAST_CITY = "tournee_v7_last_city";

// Position véhicule (parking)
const LS_VEHICLE = "tournee_v7_vehicle";
const LS_START_MODE = "tournee_start_mode"; // "mairie" | "vehicle"

/* ==== Stockage sûr (navigation privée / quota) ==== */
const __LS = (()=>{
  try{ return window.localStorage; }catch(e){ return null; }
})();
let LS_OK = true;
try{
  if(!__LS) throw new Error("no localStorage");
  const __k="__ls_test__";
  __LS.setItem(__k,"1");
  __LS.removeItem(__k);
}catch(e){
  LS_OK = false;
}
function lsGet(key){
  try{ return __LS ? __LS.getItem(key) : null; }catch(e){ return null; }
}
function lsSet(key, value){
  try{ if(!__LS) throw new Error("no localStorage"); __LS.setItem(key, value); return true; }catch(e){ LS_OK = false; return false; }
}
function lsRemove(key){
  try{ if(!__LS) throw new Error("no localStorage"); __LS.removeItem(key); return true; }catch(e){ LS_OK = false; return false; }
}
let __lsWarned = false;
function warnIfNoStorage(){
  if(!LS_OK && !__lsWarned){
    __lsWarned = true;
    setStatus("⚠️ Navigation privée: stockage limité (cache/positions non persistants).", true);
  }
}




// Choix navigation : "waze" (par défaut) ou "maps" (Google Maps en mode piéton)
const LS_NAV_APP = "tournee_v7_nav_app";

const LS_SEED_VERSION = "tournee_v7_seed_version";
const SEED_VERSION = "seed_2025-12-17_1";
const SEED_URL = "./data/adresses.csv";


const citySelect = document.getElementById("citySelect");
const addrList = document.getElementById("addrList");
const statusEl = document.getElementById("status");
const cityMeta = document.getElementById("cityMeta");
const btnOptimize = document.getElementById("btnOptimize");
const btnAdd = document.getElementById("btnAdd");
const btnExportTxt = document.getElementById("btnExportTxt");

// Parking véhicule
const btnSaveVehicle = document.getElementById("btnSaveVehicle");
const btnFindVehicle = document.getElementById("btnFindVehicle");
const vehicleHint = document.getElementById("vehicleHint");

// Toggle navigation (en haut)
const navWazeBtn = document.getElementById("navWaze");
const navMapsBtn = document.getElementById("navMaps");

// modal
const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const modalSave = document.getElementById("modalSave");
const modalCity = document.getElementById("modalCity");
const modalStreet = document.getElementById("modalStreet");
const modalPostcode = document.getElementById("modalPostcode");

let data = loadData();
let editContext = null; // {city, id}

registerSW();

function registerSW(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}

function loadData(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw) return sanitizeData(JSON.parse(raw));
  }catch(e){}
  // deep copy
  return sanitizeData(JSON.parse(JSON.stringify(INITIAL_DATA)));
}
function saveData(){
  const ok = localStorage.setItem(LS_KEY, JSON.stringify(data));
  if(!ok) warnIfNoStorage();
}

function loadMairies(){
  try{
    return JSON.parse(localStorage.getItem(LS_MAIRIES) || "{}");
  }catch(e){ return {}; }
}
function saveMairies(m){ localStorage.setItem(LS_MAIRIES, JSON.stringify(m)); }


async function fetchText(url){
  const r = await fetch(url, {cache:"no-store"});
  if(!r.ok) throw new Error("HTTP " + r.status);
  return await r.text();
}

// CSV parser (gère guillemets)
function parseCSV(text){
  const rows = [];
  let row = [], cell = "", inQ = false;
  for(let i=0;i<text.length;i++){
    const ch = text[i];
    const next = text[i+1];
    if(inQ){
      if(ch === '"' && next === '"'){ cell += '"'; i++; continue; }
      if(ch === '"'){ inQ = false; continue; }
      cell += ch; continue;
    }else{
      if(ch === '"'){ inQ = true; continue; }
      if(ch === ','){ row.push(cell); cell=""; continue; }
      if(ch === '\n'){
        row.push(cell); cell="";
        if(row.some(v=>String(v).trim()!=="")) rows.push(row);
        row=[]; continue;
      }
      if(ch === '\r') continue;
      cell += ch;
    }
  }
  if(cell.length || row.length){
    row.push(cell);
    if(row.some(v=>String(v).trim()!=="")) rows.push(row);
  }
  return rows;
}

function seedDataFromCSVText(csvText){
  const rows = parseCSV(csvText.trim());
  if(!rows.length) return {};
  const header = rows[0].map(h=>String(h||"").trim().toLowerCase());
  const idxVille = header.indexOf("ville");
  const idxOrdre = header.indexOf("ordre");
  const idxAdr = header.indexOf("adresse");
  const idxStep = header.indexOf("km_depuis_precedente");
  const idxCum = header.indexOf("km_cumul");

  const byCity = {};
  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    const ville = (r[idxVille] ?? "").trim() || "Perpignan";
    const ordre = parseInt((r[idxOrdre] ?? "0").trim(), 10) || 0;
    const full = (r[idxAdr] ?? "").trim();
    if(!full) continue;

    let postcode = "";
    const m = full.match(/\b(\d{5})\b/);
    if(m) postcode = m[1];

    let street = full;
    if(postcode){
      street = full.replace(new RegExp("\\s*"+postcode+"\\s+.*$"), "").trim();
      if(!street) street = full;
    }

    const item = {
      id: (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : (String(Date.now())+"_"+Math.random().toString(16).slice(2)),
      street,
      postcode: postcode || "",
      city: ville,
      lat: null,
      lon: null,
      done: false,
      _stepKm: idxStep >= 0 ? parseFloat(r[idxStep]) : null,
      _cumKm: idxCum >= 0 ? parseFloat(r[idxCum]) : null
    };

    if(!byCity[ville]) byCity[ville] = [];
    byCity[ville].push({ordre, item});
  }

  const out = {};
  Object.keys(byCity).forEach(v=>{
    out[v] = byCity[v].sort((a,b)=>a.ordre-b.ordre).map(x=>x.item);
  });
  return out;
}

async function ensureSeedLoaded(){
  const v = localStorage.getItem(LS_SEED_VERSION);
  if(v === SEED_VERSION) return;

  try{
    setStatus("Chargement des adresses (CSV)…");
    const txt = await fetchText(SEED_URL);
    const seeded = seedDataFromCSVText(txt);
    data = sanitizeData(seeded); // overwrite global
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    localStorage.setItem(LS_SEED_VERSION, SEED_VERSION);
    setStatus("Adresses chargées ✔");
  }catch(e){
    console.error(e);
    setStatus("Impossible de charger le CSV (vérifie data/adresses.csv).", true);
  }
}

function setStatus(msg, isError=false){
  statusEl.textContent = msg || "";
  statusEl.style.color = isError ? "var(--bad)" : "var(--muted)";
}


function stripAccents(s){
  // Compatible (évite les Unicode property escapes \p{…} qui plantent sur certains Android)
  return (s||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normSpaces(s){ return (s||"").replace(/\s+/g," ").trim(); }

function normCommune(name){
  const raw = String(name||"");
  const low = normSpaces(stripAccents(raw.toLowerCase()
    .replace(/\bfrance\b/g,"")
    .replace(/\b66\b/g,"")
  ));

  // Exclusions (hors zone / incohérent)
  if(low.includes("marseille")) return "__DROP__";
  if(low.includes("le havre") || low==="havre") return "__DROP__";
  if(low.includes("beauvais")) return "__DROP__";
  if(low.includes("vingrau")) return "__DROP__";

  // Canonicalisations
  if(low.includes("argeles")) return "Argelès-sur-Mer";
  if(low.includes("torreil")) return "Torreilles";
  if(low.includes("villelongue")) return "Villelongue-de-la-Salanque";
  if(low.includes("sainte marie") || low.includes("ste marie")) return "Sainte-Marie-la-Mer";
  if(low.includes("perpignan")) return "Perpignan";
  if(low.includes("peyrestort") || low.includes("peyris")) return "Peyrestortes";
  if(low.includes("laurent") && low.includes("salanque")) return "Saint-Laurent-de-la-Salanque";

  // Canet variants: canet / canet plage / canet en rous(s)illon
  if(low.includes("canet")) return "Canet-en-Roussillon";

  // Espira de l'Agly variants
  if(low.includes("espira") && low.includes("agly")) return "Espira-de-l'Agly";
  if(low.includes("espira") && (low.includes("l agly") || low.includes("lagly"))) return "Espira-de-l'Agly";

  // Saint-Cyprien variants
  if(low.includes("saint cyprien") || low.includes("st cyprien")) return "Saint-Cyprien";

  // Saint-Féliu d'Avall variants (typos)
  if(low.includes("feliu") || low.includes("felyu")) return "Saint-Féliu-d'Avall";

  // Default: cleaned original (capitalisation kept roughly)
  return raw.trim() || "";
}

function normStreet(s){
  let x = stripAccents(String(s||"").toLowerCase());
  x = x.replace(/[,.;]/g," ");
  x = x.replace(/\b(france)\b/g,"");
  x = x.replace(/\bavenue\b/g,"av").replace(/\bboulevard\b/g,"bd").replace(/\bplace\b/g,"pl");
  x = normSpaces(x);
  return x;
}

function sanitizeData(input){
  // 1) Flatten and normalize entries
  const flat = [];
  for(const [cityKey, arr] of Object.entries(input||{})){
    const canonKey = normCommune(cityKey);
    if(!canonKey || canonKey==="__DROP__") continue;
    for(const a of (arr||[])){
      const street = String(a.street||"").trim();
      const postcode = String(a.postcode||"").trim();
      let city = normCommune(a.city || canonKey) || canonKey;
      if(!city || city==="__DROP__") continue;

      // Exclusions by postcode / department constraints
      if(postcode === "66250") continue; // demandé : exclure 66250
      if(postcode && !/^66\d{3}$/.test(postcode)) continue;

      flat.push({
        street,
        postcode,
        city,
        done: !!a.done,
        lat: (a.lat!=null ? Number(a.lat) : null),
        lon: (a.lon!=null ? Number(a.lon) : null)
      });
    }
  }

  // 2) Infer dominant city per postcode (to fix mismatches like "66530 Beauvais")
  const pcCount = {};
  for(const a of flat){
    if(!a.postcode) continue;
    const pc = a.postcode;
    pcCount[pc] ||= {};
    pcCount[pc][a.city] = (pcCount[pc][a.city]||0) + 1;
  }
  const dominantCityByPc = {};
  for(const [pc, counts] of Object.entries(pcCount)){
    let bestCity = null, best = -1;
    for(const [c, n] of Object.entries(counts)){
      if(n>best){ best=n; bestCity=c; }
    }
    if(bestCity) dominantCityByPc[pc] = bestCity;
  }

  // 3) Apply postcode->city correction
  for(const a of flat){
    if(a.postcode && dominantCityByPc[a.postcode]){
      a.city = dominantCityByPc[a.postcode];
    }
  }

  // 4) Rebuild buckets + strong dedupe (street+postcode+city)
  const out = {};
  const seen = new Set();
  for(const a of flat){
    const key = `${normStreet(a.street)}|${a.postcode}|${stripAccents(a.city.toLowerCase())}`;
    if(seen.has(key)) continue;
    seen.add(key);
    out[a.city] ||= [];
    out[a.city].push(a);
  }

  // 5) Remove any garbage city keys that look like postcodes
  for(const k of Object.keys(out)){
    if(/^\d{5}$/.test(k)) delete out[k];
  }
  return out;
}

function addrKey(a){
  const city = stripAccents(normCommune(a.city).toLowerCase());
  const pc = String(a.postcode||"").trim();
  const st = normStreet(a.street);
  return `${st}|${pc}|${city}`;
}

function genId(){
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getCities(){
  return Object.keys(data).sort((a,b)=>a.localeCompare(b,"fr"));
}

function fillCitySelect(){
  const cities = getCities();
  citySelect.innerHTML = "";
  modalCity.innerHTML = "";
  for(const c of cities){
    const opt1 = document.createElement("option");
    opt1.value = c; opt1.textContent = c;
    citySelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = c; opt2.textContent = c;
    modalCity.appendChild(opt2);
  }
  const last = localStorage.getItem(LS_LAST_CITY);
  if(last && cities.includes(last)) citySelect.value = last;
}

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const toRad = d => d*Math.PI/180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function nominatimSearch(params){
  const url = new URL("https://nominatim.openstreetmap.org/search");
  for(const [k,v] of Object.entries(params)) url.searchParams.set(k,v);
  // Nominatim asks for a valid User-Agent; browser sets one, but we add accept-language.
  const res = await fetch(url.toString(), {
    headers: {
      "Accept":"application/json",
      "Accept-Language":"fr"
    }
  });
  if(!res.ok) throw new Error("Erreur réseau Nominatim");
  return await res.json();
}

function guessPostcodeForCity(city){
  try{
    const canon = normCommune(city);
    const arr = data[canon] || data[city] || [];
    const counts = {};
    for(const a of arr){
      if(a.postcode && /^66\d{3}$/.test(a.postcode) && a.postcode !== "66250"){
        counts[a.postcode] = (counts[a.postcode]||0) + 1;
      }
    }
    let bestPc=null, best=-1;
    for(const [pc,n] of Object.entries(counts)){
      if(n>best){ best=n; bestPc=pc; }
    }
    return bestPc;
  }catch(e){ return null; }
}
async function getMairie(city){
  const mairies = loadMairies();
  const key = stripAccents(city.toLowerCase());
  if(mairies[key]) return mairies[key];

  // 🔧 Fix ciblé : Bompas
  // Nominatim peut échouer sur "Mairie Bompas" selon les hints/typos ; on force une requête + précise
  // et on garde un fallback de coordonnées si jamais l'API renvoie 0 résultat.
  if(key === "bompas"){
    // Si déjà en cache (au cas où la clé diffère dans le stockage), on retente aussi avec une clé canonique.
    if(mairies["bompas"]) return mairies["bompas"];
    try{
      setStatus(`Géocodage de la mairie de ${city}…`);
      const resultsBompas = await nominatimSearch({
        q: "Mairie de Bompas, 12 avenue de la Salanque, 66430 Bompas, France",
        format:"jsonv2",
        addressdetails:"1",
        limit:"1",
        countrycodes:"fr"
      });
      if(resultsBompas.length){
        const r = resultsBompas[0];
        const mairie = {
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          display: r.display_name || "Mairie de Bompas"
        };
        mairies["bompas"] = mairie;
        mairies[key] = mairie;
        saveMairies(mairies);
        return mairie;
      }
    }catch(_){}
    // Fallback coordonnées (si Nominatim ne répond pas / 0 résultat)
    const mairie = { lat: 42.730316, lon: 2.935614, display: "Mairie de Bompas (fallback)" };
    mairies["bompas"] = mairie;
    mairies[key] = mairie;
    saveMairies(mairies);
    return mairie;
  }


  setStatus(`Géocodage de la mairie de ${city}…`);
  const pcHint = guessPostcodeForCity(city);
  const base = city.match(/^\d{5}$/) ? String(city) : `${city}${pcHint?` ${pcHint}`:""}`;
  const q = `Mairie ${base}, Pyrénées-Orientales, France`;
  const results = await nominatimSearch({
    q,
    format:"jsonv2",
    addressdetails:"1",
    limit:"1",
    countrycodes:"fr"
  });
  if(!results.length) throw new Error("Mairie introuvable");
  const r = results[0];
  const mairie = {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    display: r.display_name || `Mairie ${city}`
  };
  mairies[key] = mairie;
  saveMairies(mairies);
  return mairie;
}

function isInPO(address){
  // Vérification département : code postal 66 + "Pyrénées-Orientales" si disponible
  const pc = (address.postcode||"").trim();
  if(!pc.startsWith("66")) return false;
  const txt = stripAccents(JSON.stringify(address).toLowerCase());
  if(txt.includes("pyrenees-orientales") || txt.includes("pyrenees orientales")) return true;
  // si l'API ne donne pas le département, on accepte quand même si CP 66
  return true;
}

async function geocodeAddress(street, city, postcodeOpt){
  const anchor = await getAnchor(city);
  // Bias: viewbox autour du point de départ (véhicule si enregistré, sinon mairie) (~25km)
  const delta = 0.22; // degrees ~ 20-25km
  const left = (anchor.lon - delta).toFixed(6);
  const right = (anchor.lon + delta).toFixed(6);
  const top = (anchor.lat + delta).toFixed(6);
  const bottom = (anchor.lat - delta).toFixed(6);

  const pcPart = postcodeOpt ? ` ${postcodeOpt}` : "";
  const q = `${street},${pcPart} ${city}, France`;

  const results = await nominatimSearch({
    q,
    format:"jsonv2",
    addressdetails:"1",
    limit:"3",
    countrycodes:"fr",
    viewbox:`${left},${top},${right},${bottom}`,
    bounded:"1"
  });
  if(!results.length) return null;

  // Pick best: in PO and close to mairie
  let best = null;
  let bestScore = Infinity;

  for(const r of results){
    const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
    const dist = haversineKm(anchor.lat, anchor.lon, lat, lon);
    const addr = r.address || {};
    const pc = (addr.postcode||"").trim();
    const okDept = isInPO(addr);
    if(!okDept) continue;
    // If selected city is a real commune (not just postcode), ensure it's not wildly different
    // We accept if within 20km of mairie.
    if(dist > 20) continue;

    const score = dist; // simplest
    if(score < bestScore){
      bestScore = score;
      best = {
        lat, lon,
        postcode: pc || (postcodeOpt||""),
        display: r.display_name || "",
        address: addr
      };
    }
  }
  return best;
}

function ensureIds(){
  for(const city of Object.keys(data)){
    data[city] = data[city].map(a=>({
      id: a.id || genId(),
      street: a.street,
      postcode: String(a.postcode||"").replace(/\.0$/,""),
      city,
      lat: a.lat ?? null,
      lon: a.lon ?? null,
      done: !!a.done
    }));
  }
}

function dedupeCity(city){
  const arr = data[city] || [];
  const map = new Map();
  for(const a of arr){
    const key = addrKey(a);
    if(!map.has(key)) map.set(key,a);
  }
  data[city] = Array.from(map.values());
}

function currentCity(){ return citySelect.value; }

function getCityList(city){ return data[city] || []; }

function formatLine(a){
  const pc = a.postcode ? String(a.postcode).trim() : "";
  const city = a.city || "";
  return `${a.street}, ${pc} ${city}`.replace(/\s+/g," ").trim();
}

function getNavApp(){
  const v = (localStorage.getItem(LS_NAV_APP) || "waze").toLowerCase();
  return (v === "maps") ? "maps" : "waze";
}

function setNavApp(v){
  const val = (String(v||"").toLowerCase() === "maps") ? "maps" : "waze";
  localStorage.setItem(LS_NAV_APP, val);
  updateNavUI();

  // Parking véhicule
  initVehicleUI();
}

function updateNavUI(){
  const mode = getNavApp();
  if(navWazeBtn) navWazeBtn.classList.toggle("active", mode === "waze");
  if(navMapsBtn) navMapsBtn.classList.toggle("active", mode === "maps");
}


function exportAllTxt(){
  // Exporte toutes les villes + toutes les adresses dans l'ordre actuel (tri mairie si déjà appliqué)
  // Inclut aussi l'état 'fait' si présent.
  const lines = [];
  lines.push("EXPORT TOURNEE (TXT)");
  lines.push(`Date: ${new Date().toLocaleString("fr-FR")}`);
  lines.push("");

  const cities = Object.keys(data).sort((a,b)=> String(a).localeCompare(String(b),"fr"));
  for(const city of cities){
    const arr = data[city] || [];
    lines.push(`VILLE : ${city}`);
    lines.push("----------------------------------------");
    arr.forEach((a, idx)=>{
      const mark = a.done ? "✓" : " ";
      lines.push(`${String(idx+1).padStart(3,"0")}. [${mark}] ${formatLine(a)}`);
    });
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tournee-export.txt";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Export TXT téléchargé ✅");
}

function wazeUrl(a){
  const q = encodeURIComponent(formatLine(a));
  // deep link first
  return {
    deep: `waze://?q=${q}&navigate=yes`,
    web: `https://waze.com/ul?q=${q}&navigate=yes`
  };
}

function mapsWalkUrl(a){
  // URL stable (PWA / iOS / Android) : Google Maps Directions API
  const dest = encodeURIComponent(formatLine(a));
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
}

function render(){
  const city = currentCity();
  localStorage.setItem(LS_LAST_CITY, city);

  const arr = [...getCityList(city)];
  const total = arr.length;
  const done = arr.filter(a=>a.done).length;

  cityMeta.textContent = `${city} • ${done} / ${total} faits`;

  // ordre conservé : mairie → plus proche → plus proche…
addrList.innerHTML = "";
  arr.forEach((a, idx)=>{
    const li = document.createElement("li");
    li.className = "addr";

    const num = document.createElement("div");
    num.className = "num";
    num.textContent = String(idx+1);

    const main = document.createElement("div");
    main.className = "addrmain tapzone";

    const l1 = document.createElement("div");
    l1.className = "line1";
    l1.textContent = a.street;

    const l2 = document.createElement("div");
    l2.className = "line2";

    const topRow = document.createElement("div");
    topRow.className = "badgerow";

    const kmRow = document.createElement("div");
    kmRow.className = "kmrow";

    const b1 = document.createElement("span");
    b1.className = "badge citypill";
    b1.textContent = `${a.postcode} • ${a.city}`;

    const b2 = document.createElement("span");
    b2.className = "badge " + (a.done ? "done" : "todo");
    b2.innerHTML = a.done ? "✓ <strong>Fait</strong>" : "À faire";
    b2.style.cursor = "pointer";
    b2.addEventListener("click", (e)=>{
      e.stopPropagation();
      a.done = !a.done;
      saveData();
      render();
    });

    topRow.appendChild(b1);
    topRow.appendChild(b2);

    if(typeof a._stepKm === "number" && isFinite(a._stepKm)){
      const b3 = document.createElement("span");
      b3.className = "badge";
      b3.textContent = `+${a._stepKm.toFixed(1)} km`;
      kmRow.appendChild(b3);
    }
    if(typeof a._cumKm === "number" && isFinite(a._cumKm)){
      const b4 = document.createElement("span");
      b4.className = "badge";
      b4.textContent = `cumul ${a._cumKm.toFixed(1)} km`;
      kmRow.appendChild(b4);
    }

    l2.appendChild(topRow);
    if(kmRow.childNodes.length) l2.appendChild(kmRow);

    main.appendChild(l1);
    main.appendChild(l2);

    main.addEventListener("click", ()=>{
      // Ouvre l'adresse dans l'app choisie (Waze ou Google Maps en mode piéton)
      a.done = true;
      saveData();
      render();

      const mode = getNavApp();
      if(mode === "maps"){
        window.location.href = mapsWalkUrl(a);
        return;
      }

      const url = wazeUrl(a);
      // Try deep link; if blocked, user can still have Waze installed
      window.location.href = url.deep;
      // Ne pas ouvrir waze.com automatiquement (sinon au retour ça affiche la page waze.com)
      // Fallback seulement si Waze ne s'est pas ouvert (page toujours visible)
      setTimeout(()=>{
        if(document.visibilityState === "visible"){
          if(confirm("Waze ne s'est pas ouvert. Ouvrir la version web ?")) window.open(url.web, "_blank");
        }
      }, 900);
    });

    const actions = document.createElement("div");
    actions.className = "actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "iconbtn";
    btnEdit.textContent = "✎";
    btnEdit.title = "Modifier";
    btnEdit.addEventListener("click",(e)=>{ e.stopPropagation(); openEdit(city, a.id); });

    const btnDel = document.createElement("button");
    btnDel.className = "iconbtn";
    btnDel.textContent = "🗑";
    btnDel.title = "Supprimer";
    btnDel.addEventListener("click",(e)=>{
      e.stopPropagation();
      if(confirm("Supprimer cette adresse ?")){
        data[city] = data[city].filter(x=>x.id !== a.id);
        saveData();
        render();
      }
    });

    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);

    li.appendChild(num);
    li.appendChild(main);
    li.appendChild(actions);
    addrList.appendChild(li);
  });
}


function getDefaultPostcode(city){
  // Devine un code postal à partir des adresses déjà enregistrées pour cette ville
  const list = data?.[city] || [];
  const counts = {};
  for(const a of list){
    const cp = String(a.postcode || "").trim();
    if(/^66\d{3}$/.test(cp)) counts[cp] = (counts[cp] || 0) + 1;
  }
  let best = "";
  let bestN = -1;
  for(const [cp,n] of Object.entries(counts)){
    if(n > bestN){ bestN = n; best = cp; }
  }
  return best;
}

function openModal(mode, preset){
  editContext = preset?.editContext || null;
  modalTitle.textContent = mode === "edit" ? "Modifier une adresse" : "Ajouter une adresse";
  modalCity.value = preset?.city || currentCity();
  modalStreet.value = preset?.street || "";
  modalPostcode.value = (preset?.postcode || "") || getDefaultPostcode(modalCity.value);
  modal.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
  setTimeout(()=>modalStreet.focus(), 60);
}

function closeModal(){
  modal.classList.add("hidden");
  modalBackdrop.classList.add("hidden");
  editContext = null;
}

async function saveModal(){
  const city = modalCity.value;
  const street = normSpaces(modalStreet.value);
  const pcOpt = normSpaces(modalPostcode.value).replace(/\D/g,"").slice(0,5);

  if(!street){
    setStatus("Adresse manquante.", true);
    return;
  }

  try{
    setStatus("Géocodage de l'adresse…");
    const g = await geocodeAddress(street, city, pcOpt);
    if(!g) {
      setStatus("Adresse introuvable (dans la zone autour de la mairie).", true);
      return;
    }

    const pc = (g.postcode||pcOpt||"").trim();
    if(!pc.startsWith("66")){
      setStatus("Refusé : cette adresse n'est pas dans le département 66.", true);
      return;
    }

    // build object
    const obj = {
      id: editContext?.id || genId(),
      street,
      postcode: pc,
      city,
      lat: g.lat,
      lon: g.lon,
      done: false
    };

    // city list exists
    if(!data[city]) data[city] = [];

    // Dedupe
    const key = addrKey(obj);
    const exists = data[city].some(a=>a.id !== obj.id && addrKey(a) === key);
    if(exists){
      setStatus("Doublon détecté : cette adresse existe déjà.", true);
      return;
    }

    if(editContext){
      data[city] = data[city].map(a=> a.id === obj.id ? {...a, ...obj} : a);
    } else {
      data[city].push(obj);
    }

    dedupeCity(city);
    saveData();

    // Update distances + order
    await applyOrderForCity(city);

    closeModal();
    setStatus("OK ✅");
    fillCitySelect();
    citySelect.value = city;
    render();
  }catch(e){
    setStatus(e.message || "Erreur pendant le géocodage.", true);
  }
}

function openEdit(city, id){
  const a = (data[city]||[]).find(x=>x.id===id);
  if(!a) return;
  openModal("edit", {
    city,
    street: a.street,
    postcode: a.postcode,
    editContext: {city, id}
  });
}

async function applyOrderForCity(city){
  const anchor = await getAnchor(city);

  const arr = getCityList(city);

  const ok = [];
  const ko = [];
  for(const a of arr){
    if(typeof a.lat === "number" && typeof a.lon === "number"){
      ok.push(a);
    }else{
      ko.push(a);
    }
  }

  let curLat = anchor.lat;
  let curLon = anchor.lon;
  let cum = 0;

  const ordered = [];
  while(ok.length){
    let bestIdx = 0;
    let bestD = Infinity;

    for(let i=0;i<ok.length;i++){
      const a = ok[i];
      const d = haversineKm(curLat, curLon, a.lat, a.lon);
      if(d < bestD){
        bestD = d;
        bestIdx = i;
      }
    }

    const next = ok.splice(bestIdx, 1)[0];
    next._stepKm = isFinite(bestD) ? bestD : null;
    if(next._stepKm != null) cum += next._stepKm;
    next._cumKm = next._stepKm != null ? cum : null;

    ordered.push(next);
    curLat = next.lat;
    curLon = next.lon;
  }

  for(const a of ko){
    a._stepKm = null;
    a._cumKm = null;
  }

  data[city] = [...ordered, ...ko];
  saveData();
}

async function optimizeCity(){
  const city = currentCity();
  try{
    const anchor = await getAnchor(city);
    const arr = data[city] || [];
    let missing = arr.filter(a=>!(typeof a.lat==="number" && typeof a.lon==="number")).length;

    if(missing === 0){
      setStatus("Déjà géocodé. Tri en cours…");
      await applyOrderForCity(city);
      render();
      setStatus("OK ✅");
      return;
    }

    setStatus(`Géocodage manquant : ${missing} adresse(s)…`);
    // rate limit ~1req/s
    for(const a of arr){
      if(typeof a.lat==="number" && typeof a.lon==="number") continue;
      const pcOpt = (a.postcode||"").trim();
      const g = await geocodeAddress(a.street, city, pcOpt);
      if(g){
        a.lat = g.lat; a.lon = g.lon;
        a.postcode = (g.postcode||a.postcode||"").trim();
      }
      missing = arr.filter(x=>!(typeof x.lat==="number" && typeof x.lon==="number")).length;
      setStatus(`Géocodage… restant: ${missing}`);
      saveData();
      await sleep(1100);
    }

    // Remove anything that ended up outside 66
    data[city] = (data[city]||[]).filter(a=>String(a.postcode||"").startsWith("66"));
    dedupeCity(city);
    await applyOrderForCity(city);
    render();
    setStatus("Optimisation terminée ✅");
  }catch(e){
    setStatus(e.message || "Erreur optimisation.", true);
  }
}


function loadVehicle(){
  try{ return JSON.parse(localStorage.getItem(LS_VEHICLE) || "null"); }catch(e){ return null; }
}
function saveVehiclePos(pos){
  const ok = localStorage.setItem(LS_VEHICLE, JSON.stringify(pos));
  if(!ok) warnIfNoStorage();
}

function fmtStationTs(ts){
  if(!ts) return null;
  try{
    const d = new Date(ts);
    // If not today, include date
    const now = new Date();
    const sameDay = d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
    const t = d.toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"});
    if(sameDay) return t;
    const dd = d.toLocaleDateString("fr-FR", {day:"2-digit", month:"2-digit"});
    return `${dd} à ${t}`;
  }catch(e){ return null; }
}
function updateVehicleHint(){
  if(!vehicleHint) return;
  const v = loadVehicle();
  if(v && typeof v.lat==="number" && typeof v.lon==="number"){
    const t = fmtStationTs(v.ts);
    vehicleHint.textContent = t ? `Stationné à ${t}` : "Véhicule enregistré ✅";
  }else{
    vehicleHint.textContent = "Véhicule non enregistré";
  }
}



function getStartMode(){
  const v = lsGet(LS_START_MODE);
  return (v==="vehicle" || v==="mairie") ? v : "mairie";
}
function setStartMode(mode){
  const m = (mode==="vehicle") ? "vehicle" : "mairie";
  const ok = lsSet(LS_START_MODE, m);
  if(!ok) warnIfNoStorage();
  updateStartModeUI();
}
function updateStartModeUI(){
  const m = getStartMode();
  const btnM = document.getElementById("btnStartMairie");
  const btnV = document.getElementById("btnStartVehicle");
  if(btnM) btnM.classList.toggle("is-active", m==="mairie");
  if(btnV) btnV.classList.toggle("is-active", m==="vehicle");
  // si pas de véhicule, on force mairie
  const v = loadVehicle();
  const hasVehicle = !!(v && typeof v.lat==="number" && typeof v.lon==="number");
  if(btnV) btnV.disabled = !hasVehicle;
  if(m==="vehicle" && !hasVehicle){
    // force fallback mairie
    if(LS_OK) lsSet(LS_START_MODE, "mairie");
    if(btnM) btnM.classList.add("is-active");
    if(btnV) btnV.classList.remove("is-active");
  }
}


// Point de départ (mairie par défaut, véhicule si enregistré)
async function getAnchor(city){
  // Choix du point de départ :
  // - par défaut : mairie de la ville sélectionnée
  // - si mode "vehicle" et véhicule enregistré : véhicule
  const mode = (typeof getStartMode === "function") ? getStartMode() : "mairie";
  if(mode === "vehicle"){
    const v = loadVehicle();
    if(v && typeof v.lat === "number" && typeof v.lon === "number"){
      return { lat: v.lat, lon: v.lon, display: "Véhicule", source: "vehicle", ts: v.ts || null };
    }
  }
  const mairie = await getMairie(city);
  return { lat: mairie.lat, lon: mairie.lon, display: mairie.display || "Mairie", source: "mairie", ts: null };
}

function setFindEnabled(on){
  if(!btnFindVehicle) return;
  btnFindVehicle.disabled = !on;
  btnFindVehicle.setAttribute("aria-disabled", (!on).toString());
}
function bindOnce(el, key, handler){
  if(!el) return;
  if(el.dataset && el.dataset[key]==="1") return;
  if(el.dataset) el.dataset[key] = "1";
  el.addEventListener("click", handler);
}

function initVehicleUI(){
  if(!btnSaveVehicle && !btnFindVehicle) return;

  const v = loadVehicle();
  setFindEnabled(!!(v && typeof v.lat==="number" && typeof v.lon==="number"));
  updateVehicleHint();
  updateStartModeUI();

  const btnStartMairie = document.getElementById("btnStartMairie");
  const btnStartVehicle = document.getElementById("btnStartVehicle");
  bindOnce(btnStartMairie, "boundStartMairie", ()=> setStartMode("mairie"));
  bindOnce(btnStartVehicle, "boundStartVehicle", ()=> setStartMode("vehicle"));

  if(btnSaveVehicle){
    bindOnce(btnSaveVehicle, "boundSaveVehicle", async ()=>{
      const existing = loadVehicle();
      if(existing && typeof existing.lat==="number" && typeof existing.lon==="number"){
        const t = fmtStationTs(existing.ts);
        const msg = t
          ? `Une position véhicule est déjà enregistrée (stationné à ${t}).

Remplacer cette position ?`
          : `Une position véhicule est déjà enregistrée.

Remplacer cette position ?`;
        if(!confirm(msg)){
          setStatus("Position véhicule conservée.");
          return;
        }
      }
      if(!("geolocation" in navigator)){
        setStatus("Géolocalisation indisponible sur ce téléphone.", true);
        return;
      }
      setStatus("Enregistrement du véhicule…");
      navigator.geolocation.getCurrentPosition((p)=>{
        const lat = p.coords.latitude;
        const lon = p.coords.longitude;
        const payload = {lat, lon, ts: Date.now()};
        saveVehiclePos(payload);
        setFindEnabled(true);
        updateVehicleHint();
  updateStartModeUI();

  const btnStartMairie = document.getElementById("btnStartMairie");
  const btnStartVehicle = document.getElementById("btnStartVehicle");
  bindOnce(btnStartMairie, "boundStartMairie", ()=> setStartMode("mairie"));
  bindOnce(btnStartVehicle, "boundStartVehicle", ()=> setStartMode("vehicle"));
        setStatus("Véhicule enregistré ✅");
      }, (err)=>{
        console.error(err);
        const msg = (err && err.code === 1)
          ? "Autorise la localisation pour enregistrer le véhicule."
          : "Impossible de récupérer ta position.";
        setStatus(msg, true);
      }, {enableHighAccuracy:true, timeout:12000, maximumAge:10000});
    });
  }

  if(btnFindVehicle){
    bindOnce(btnFindVehicle, "boundFindVehicle", ()=>{
      const v = loadVehicle();
      if(!v || typeof v.lat!=="number" || typeof v.lon!=="number"){
        setFindEnabled(false);
        updateVehicleHint();
  updateStartModeUI();

  const btnStartMairie = document.getElementById("btnStartMairie");
  const btnStartVehicle = document.getElementById("btnStartVehicle");
  bindOnce(btnStartMairie, "boundStartMairie", ()=> setStartMode("mairie"));
  bindOnce(btnStartVehicle, "boundStartVehicle", ()=> setStartMode("vehicle"));
        setStatus("Aucun véhicule enregistré. Clique d’abord sur “Enregistrer véhicule”.", true);
        return;
      }
      const url = `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lon}&travelmode=walking`;
      window.open(url, "_blank");
    });
  }
}

async function wire(){
  await ensureSeedLoaded();

  fillCitySelect();
  ensureIds();
  // cleanup: dedupe every city and remove non-66
  for(const city of Object.keys(data)){
    data[city] = (data[city]||[]).filter(a=>String(a.postcode||"").startsWith("66"));
    dedupeCity(city);
  }
  saveData();

  citySelect.addEventListener("change", async ()=>{
    setStatus("");
    try{
      await applyOrderForCity(currentCity());
    }catch(_){}
    render();
  });

  btnOptimize.addEventListener("click", ()=>optimizeCity());
  btnAdd.addEventListener("click", ()=>openModal("add", {city: currentCity()}));
  btnExportTxt && btnExportTxt.addEventListener("click", exportAllTxt);

  // Toggle navigation (Waze / Maps piéton)
  if(navWazeBtn) navWazeBtn.addEventListener("click", ()=>setNavApp("waze"));
  if(navMapsBtn) navMapsBtn.addEventListener("click", ()=>setNavApp("maps"));
  updateNavUI();

  // Parking véhicule
  initVehicleUI();

  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  modalSave.addEventListener("click", saveModal);

  // initial render
  applyOrderForCity(currentCity()).then(()=>render()).catch(()=>render());
}

wire().catch(e=>{ console.error(e); });
