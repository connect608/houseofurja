export type Dish = {
  id?: number;
  name: string;
  description: string;
  price: string;
  isAvailable?: boolean;
};

export type MenuCategory = {
  id?: number;
  title: string;
  description: string[];
  items: Dish[];
  image: string;
  imageAlt: string;
  isActive?: boolean;
};

export const menuCategories: Record<string, MenuCategory> = {
  "Our Menu": {
    title: "Our Menu",
    description: [
      "Rooted in the flavors of India and the comforts of America, these are the dishes you'll want to add to your regular lunch rotation. Made with care, seasoned with intention, and always satisfying.",
    ],
    image: "/assets/menu-indian.webp",
    imageAlt: "Indian curry served with rice, flatbread, herbs, and fresh vegetables",
    items: [
      {
        name: "Smoked Dal Makhani",
        description:
          "Slow-cooked black lentils with cultured butter, tomato, and fragrant fenugreek.",
        price: "$14",
      },
      {
        name: "Garden Tikka Bowl",
        description:
          "Seasonal vegetables with mustard, coriander, basmati rice, and a bright herb chutney.",
        price: "$15",
      },
      {
        name: "Tandoori Chicken",
        description:
          "Yogurt-marinated chicken with Kashmiri chilli, charred lime, mint, and warming spice.",
        price: "$17",
      },
      {
        name: "Saffron Rice Plate",
        description:
          "Aged basmati rice with saffron, browned onion, fresh herbs, and cooling raita.",
        price: "$13",
      },
    ],
  },
  "Today's Special": {
    title: "Today's Special",
    description: [
      "A little something different to look forward to.",
      "Each day, our kitchen explores a new corner of the culinary world, introducing a special inspired by cuisines beyond our Indian favorites. Check back regularly to see where our menu takes us next.",
    ],
    image: "/assets/menu-weekly.webp",
    imageAlt: "An overhead spread of colorful chef-prepared dishes",
    items: [
      {
        name: "Butter Chicken",
        description:
          "Tender chicken in a velvety tomato sauce with cultured butter, fenugreek, and warming spice, served with fragrant basmati rice.",
        price: "$17",
      },
    ],
  },
  "Something to Sip": {
    title: "Something to Sip",
    description: [
      "Refreshing drinks, thoughtfully chosen to pair with bold flavors and keep your afternoon feeling bright.",
    ],
    image: "/assets/menu-chai.webp",
    imageAlt: "A warmly styled glass of chai tea",
    items: [
      {
        name: "Masala Chai",
        description:
          "Assam tea simmered with ginger, cardamom, warming spices, and milk.",
        price: "$4",
      },
      {
        name: "Mango Lassi",
        description:
          "Alphonso mango blended with yogurt, cardamom, and a touch of rose.",
        price: "$6",
      },
    ],
  },
};
