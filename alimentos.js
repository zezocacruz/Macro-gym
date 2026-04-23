// ===== BASE DE DADOS DE ALIMENTOS =====
// Valores por 100g (ou 100ml em líquidos)
// Podes adicionar mais alimentos seguindo este formato:
// { nome: "Nome do alimento", cal: kcal, p: proteína, h: hidratos, g: gordura }

const ALIMENTOS = [
    // --- CARNES E PEIXE ---
    { nome: "Frango grelhado (peito)", cal: 165, p: 31,   h: 0,    g: 3.6 },
    { nome: "Peito de peru",           cal: 135, p: 30,   h: 0,    g: 1   },
    { nome: "Carne de vaca magra",     cal: 250, p: 26,   h: 0,    g: 15  },
    { nome: "Carne de porco (lombo)",  cal: 143, p: 21,   h: 0,    g: 6   },
    { nome: "Salmão grelhado",         cal: 208, p: 20,   h: 0,    g: 13  },
    { nome: "Atum em conserva (água)", cal: 116, p: 26,   h: 0,    g: 1   },
    { nome: "Bacalhau cozido",         cal: 105, p: 23,   h: 0,    g: 0.9 },
    { nome: "Ovo inteiro",             cal: 155, p: 13,   h: 1.1,  g: 11  },
    { nome: "Clara de ovo",            cal: 52,  p: 11,   h: 0.7,  g: 0.2 },

    // --- HIDRATOS ---
    { nome: "Arroz branco cozido",     cal: 130, p: 2.7,  h: 28,   g: 0.3 },
    { nome: "Arroz integral cozido",   cal: 111, p: 2.6,  h: 23,   g: 0.9 },
    { nome: "Massa cozida",            cal: 131, p: 5,    h: 25,   g: 1.1 },
    { nome: "Batata cozida",           cal: 87,  p: 1.9,  h: 20,   g: 0.1 },
    { nome: "Batata doce cozida",      cal: 86,  p: 1.6,  h: 20,   g: 0.1 },
    { nome: "Pão de trigo",            cal: 265, p: 9,    h: 49,   g: 3.2 },
    { nome: "Pão integral",            cal: 247, p: 13,   h: 41,   g: 3.4 },
    { nome: "Aveia (flocos)",          cal: 389, p: 17,   h: 66,   g: 7   },
    { nome: "Quinoa cozida",           cal: 120, p: 4.4,  h: 21,   g: 1.9 },
    { nome: "Feijão cozido",           cal: 127, p: 8.7,  h: 23,   g: 0.5 },
    { nome: "Grão-de-bico cozido",     cal: 164, p: 8.9,  h: 27,   g: 2.6 },
    { nome: "Lentilhas cozidas",       cal: 116, p: 9,    h: 20,   g: 0.4 },

    // --- LATICÍNIOS ---
    { nome: "Leite meio-gordo",        cal: 46,  p: 3.4,  h: 4.7,  g: 1.6 },
    { nome: "Leite magro",             cal: 34,  p: 3.4,  h: 5,    g: 0.1 },
    { nome: "Iogurte natural",         cal: 59,  p: 10,   h: 3.6,  g: 0.4 },
    { nome: "Iogurte grego",           cal: 97,  p: 9,    h: 3.6,  g: 5   },
    { nome: "Queijo flamengo",         cal: 330, p: 25,   h: 1,    g: 25  },
    { nome: "Queijo fresco magro",     cal: 99,  p: 17,   h: 2,    g: 2.5 },
    { nome: "Requeijão",               cal: 170, p: 11,   h: 1.4,  g: 13  },

    // --- FRUTAS ---
    { nome: "Banana",                  cal: 89,  p: 1.1,  h: 23,   g: 0.3 },
    { nome: "Maçã",                    cal: 52,  p: 0.3,  h: 14,   g: 0.2 },
    { nome: "Laranja",                 cal: 47,  p: 0.9,  h: 12,   g: 0.1 },
    { nome: "Pera",                    cal: 57,  p: 0.4,  h: 15,   g: 0.1 },
    { nome: "Morangos",                cal: 32,  p: 0.7,  h: 7.7,  g: 0.3 },
    { nome: "Uvas",                    cal: 69,  p: 0.7,  h: 18,   g: 0.2 },
    { nome: "Kiwi",                    cal: 61,  p: 1.1,  h: 15,   g: 0.5 },
    { nome: "Ananás",                  cal: 50,  p: 0.5,  h: 13,   g: 0.1 },

    // --- VEGETAIS ---
    { nome: "Brócolos cozidos",        cal: 34,  p: 2.8,  h: 7,    g: 0.4 },
    { nome: "Couve-flor",              cal: 25,  p: 1.9,  h: 5,    g: 0.3 },
    { nome: "Cenoura",                 cal: 41,  p: 0.9,  h: 10,   g: 0.2 },
    { nome: "Espinafres",              cal: 23,  p: 2.9,  h: 3.6,  g: 0.4 },
    { nome: "Tomate",                  cal: 18,  p: 0.9,  h: 3.9,  g: 0.2 },
    { nome: "Alface",                  cal: 15,  p: 1.4,  h: 2.9,  g: 0.2 },
    { nome: "Pepino",                  cal: 16,  p: 0.7,  h: 3.6,  g: 0.1 },

    // --- GORDURAS E OUTROS ---
    { nome: "Azeite",                  cal: 884, p: 0,    h: 0,    g: 100 },
    { nome: "Manteiga",                cal: 717, p: 0.9,  h: 0.1,  g: 81  },
    { nome: "Manteiga de amendoim",    cal: 588, p: 25,   h: 20,   g: 50  },
    { nome: "Amêndoas",                cal: 579, p: 21,   h: 22,   g: 50  },
    { nome: "Nozes",                   cal: 654, p: 15,   h: 14,   g: 65  },
    { nome: "Abacate",                 cal: 160, p: 2,    h: 9,    g: 15  },

    // --- SUPLEMENTOS ---
    { nome: "Whey protein (pó)",       cal: 400, p: 80,   h: 5,    g: 5   },
    { nome: "Proteína vegetal (pó)",   cal: 370, p: 70,   h: 10,   g: 5   },
    { nome: "Creatina (pó)",           cal: 0,   p: 0,    h: 0,    g: 0   },

    // --- OUTROS ---
    { nome: "Chocolate preto 70%",     cal: 598, p: 7.8,  h: 46,   g: 43  },
    { nome: "Mel",                     cal: 304, p: 0.3,  h: 82,   g: 0   }
];
