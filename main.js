const initApp = () => {
  // adding listeners

  const geoBtn = document.getElementById("getLocation");
  geoBtn.addEventListener("click", getGeoWeather);

  const homeBtn = document.getElementById("home");
  homeBtn.addEventListener("click", loadWeather);

  const saveBtn = document.getElementById("save-location");
  saveBtn.addEventListener("click", saveLocation);
  //setup

  const unitBtn = document.getElementById("temp-unit");
  unitBtn.addEventListener("click", toggleUnits);

  const refreshBtn = document.getElementById("refresh");
  refreshBtn.addEventListener("click", refreshWeather);

  const locationInput = document.getElementById("searchbar-form");
  locationInput.addEventListener("submit", submitLocation);

  // setPlaceholderText();
  //load weather
  loadWeather();
};

document.addEventListener("DOMContentLoaded", initApp);

class currentLocation {
  constructor() {
    this._name = "Current Location";
    this._lat = "null";
    this._lon = "null";
    this._unit = "imperial";
  }

  //customized getter/setter methods

  getname() {
    return this._name;
  }

  setname(name) {
    this._name = name;
  }

  setlat(lat) {
    this._lat = lat;
  }

  getlat() {
    return this._lat;
  }

  setlon(lon) {
    this._lon = lon;
  }

  getlon() {
    return this._lon;
  }

  getunit() {
    return this._unit;
  }

  setunit(unit) {
    this._unit = unit;
  }

  toggleUnit(unit) {
    this._unit = this._unit === "imperial" ? "metric" : "imperial";
  }
}

const currentLoc = new currentLocation();

// DOM Functions

const getGeoWeather = (event) => {
  if (event) {
    if (event.type === "click") {
      const mapIcon = document.querySelector(".fa-map-marker-alt");
      addSpinner(mapIcon);
    }
  }

  if (!navigator.geolocation) return geoError();
  navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
};

const geoError = (errObj) => {
  const errMsg = errObj ? errObj.message : "Geo-Location not supported!";
  displayError(errMsg, errMsg);
};

const displayError = (headerMsg, srMsg) => {
  updateWeatherLocationHHeader(headerMsg); //helper functions defined below
  updateScreenReaderConfirmation(srMsg);
};

const updateWeatherLocationHHeader = (message) => {
  const h1 = document.getElementById("currentStatus-location");
  h1.textContent = message;
};

const updateScreenReaderConfirmation = (message) => {
  document.getElementById("confirmation").textContent = message;
};

const geoSuccess = (position) => {
  const latitude = position.coords.latitude.toFixed(4);
  const longitude = position.coords.longitude.toFixed(4);

  const myCoordsObj = {
    lat: parseFloat(latitude), // Convert back to number after formatting
    lon: parseFloat(longitude), // Convert back to number after formatting
    name: `Lat: ${latitude} Long: ${longitude}`, // Use formatted values in the name
  };

  setLocationObject(currentLoc, myCoordsObj);
  // console.log(currentLoc);

  updateDataAndDisplay(currentLoc);
};

const loadWeather = (event) => {
  const savedLocation = getHomeLocation();
  if (!savedLocation && !event) return getGeoWeather(); //if there is no saved location and no event (location) is passed, we will get the weather
  if (!savedLocation && event.type === "click") {
    // if there is no saved location and 'saved btn' is pressed, then error will be thrown
    displayError(
      "No saved location found!",
      "Please save your location first!"
    ); //second line for screen reader
  } else if (savedLocation && !event) {
    //location has been saved in the past but there is no current event, then we will display saved location on click
    displayHomeLocationWeather(savedLocation);
  } else {
    // if the saved btn is not clicked then we will just add a spinner and wait for the function to fetch home weather
    const homeIcon = document.querySelector(".fa-home");
    addSpinner(homeIcon);
    displayHomeLocationWeather(savedLocation);
  }
};

const displayHomeLocationWeather = (home) => {
  if (typeof home === "string") {
    const jsonString = JSON.parse(home); //converting json string into js type object/value for manipulation

    const myCoordsObj = {
      lat: jsonString.lat,
      lon: jsonString.lon,
      name: jsonString.name,
      unit: jsonString.unit,
    };

    setLocationObject(currentLoc, myCoordsObj);
    updateDataAndDisplay(currentLoc);
  }
};

const saveLocation = () => {
  if (currentLoc.getlat() && currentLoc.getlon()) {
    const saveIcon = document.querySelector("#save-location .fa-save");
    addSpinner(saveIcon);

    const location = {
      name: currentLoc.getname(),
      lat: currentLoc.getlat(),
      lon: currentLoc.getlon(),
      unit: currentLoc.getunit(),
    };

    localStorage.setItem("defaultWeatherLocation", JSON.stringify(location));
    updateScreenReaderConfirmation(
      `Saved ${currentLoc.getname} as Home Location.`
    );
  }
};

const toggleUnits = () => {
  const unitIcon = document.querySelector(".fa-chart-bar");
  addSpinner(unitIcon);
  const unit = currentLoc.getunit();

  //   if(unit === "imperial") {}

  currentLoc.toggleUnit(unit);

  updateDataAndDisplay(currentLoc);

  //   console.log(currentLoc)
};

const refreshWeather = () => {
  const refreshIcon = document.querySelector(".fa-sync-alt");
  addSpinner(refreshIcon);
  updateDataAndDisplay(currentLoc);
};

const submitLocation = async (event) => {
  event.preventDefault();

  const text = document.getElementById("searchbar-text").value;
  const entryText = cleanText(text);

  if (!entryText.length) return;

  const locationIcon = document.querySelector(".fa-search");
  addSpinner(locationIcon);

  const coordsData = await getCoordsFromApi(entryText, currentLoc.getunit());
  //   console.log(coordsData);

  if (coordsData) {
    if (coordsData.location) {
      //work with the api info
      //success
      const myCoordsObj = {
        lat: coordsData.location.lat, // Use API response data
        lon: coordsData.location.lon, // Use API response data
        name: `${coordsData.location.name}, ${coordsData.location.country}`, // Combine location name and country
        unit: currentLoc.getunit(),
      };
      setLocationObject(currentLoc, myCoordsObj);
      updateDataAndDisplay(currentLoc);
    } else {
      // console.log("API Error Object:", coordsData.error);
      displayApiError(coordsData);
    }
  } else {
    displayError("Connection Error", "Connection-Error.");
  }
};

const getCoordsFromApi = async (entryText, units) => {
  const regex = /^\d+$/g;
  const flag = regex.test(entryText) ? "zip" : "query"; // 'zip' or general query
  const apiKey = "a27976b9ec68420aaac6ae4cc83e30cb";
  const url = `http://api.weatherstack.com/current?access_key=${apiKey}&${flag}=${encodeURIComponent(
    entryText
  )}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const jsonData = await response.json();
    // console.log('API Response:', jsonData);  Add this line for debugging
    return jsonData;
  } catch (err) {
    console.error("API request error:", err);
    return null;
  }
};

const displayApiError = (error) => {
  let errorMsg = "Unknown Error"; // Default error message

  if (error && typeof error === "object") {
    // Trying to extract meaningful information from the error object
    if (error.code && error.info) {
      errorMsg = `Error ${error.code}: ${error.info}`;
    } else if (error.info) {
      // Fallback to 'info' if code is missing
      errorMsg = error.info;
    } else if (error.message) {
      // Checking if there is a 'message' field in the error object
      errorMsg = error.message;
    }
  }

  // console.log("Displaying API error:", errorMsg);
  updateWeatherLocationHHeader(errorMsg);
  updateScreenReaderConfirmation(`${errorMsg}. Please Try Again!`);
};

const toProperCase = (text = "") => {
  if (!text) return "Unknown"; // Return "Unknown" if no valid text is provided.
  const words = text.split(" ");
  const properWords = words.map((word) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return properWords.join(" ");
};

const updateDataAndDisplay = async (locationObj) => {
  // console.log(locationObj);

  const weatherJson = await getWeatherFromCoords(locationObj);
  //  console.log(weatherJson);
  if (weatherJson) {
    updateDisplay(weatherJson, locationObj);
  }
};

const updateDisplay = (weatherJson, locationObj) => {
  console.log("Full weatherJson:", weatherJson);
  console.log(locationObj);
  // Log the entire weatherJson object

  fadeDisplay();

  clearDisplay();

  const currentWeather = weatherJson[0]; // Assuming you get the first day's data from the forecast
  const weatherIcon = `//cdn.weatherapi.com/weather/64x64/day/${currentWeather.day.condition.icon}`;

  if (!weatherIcon) {
    console.error("Condition data is missing");
    return;
  }
  const weatherClass = getWeatherClass(weatherIcon);

  setBGImage(weatherJson);

  //   const screenReaderWeather = buildScreenReaderWeather(
  //     weatherJson,
  //     locationObj
  //   );

  //   updateScreenReaderConfirmation(screenReaderWeather);

  updateWeatherLocationHHeader(locationObj.getname());

  const currentConditionsArr = createCurrentConditionsDivs(
    weatherJson,
    locationObj.getunit()
  );

  //   console.log(currentConditionsArr);

  displayCurrentConditions(currentConditionsArr);
  displayWeeklyForecast(weatherJson);
  setFocusOnSearch();

  fadeDisplay();
};

const getWeatherClass = (icon) => {
  // Extract day or night from the icon code (assuming icon ends with 'd' or 'n')
  const isDay = icon.endsWith("d");
  const conditionCode = parseInt(icon.slice(0, -1), 10); // Remove 'd' or 'n' and convert to integer

  const weatherMap = {
    // Rainy
    200: isDay ? "rain" : "rain-night", // Thunderstorm with light rain
    201: isDay ? "rain" : "rain-night", // Thunderstorm with rain
    202: isDay ? "rain" : "rain-night", // Thunderstorm with heavy rain
    230: isDay ? "rain" : "rain-night", // Thunderstorm with drizzle
    231: isDay ? "rain" : "rain-night", // Thunderstorm with rain
    232: isDay ? "rain" : "rain-night", // Thunderstorm with heavy rain

    // Foggy
    300: isDay ? "fog" : "fog-night", // Drizzle
    301: isDay ? "fog" : "fog-night", // Light drizzle
    302: isDay ? "fog" : "fog-night", // Heavy drizzle
    500: isDay ? "fog" : "fog-night", // Light rain
    501: isDay ? "fog" : "fog-night", // Moderate rain
    502: isDay ? "fog" : "fog-night", // Heavy rain
    511: isDay ? "fog" : "fog-night", // Freezing rain

    // Snowy
    600: isDay ? "snow" : "snow-night", // Light snow
    601: isDay ? "snow" : "snow-night", // Snow
    602: isDay ? "snow" : "snow-night", // Heavy snow
    611: isDay ? "snow" : "snow-night", // Sleet
    612: isDay ? "snow" : "snow-night", // Light sleet
    613: isDay ? "snow" : "snow-night", // Sleet
    615: isDay ? "snow" : "snow-night", // Light snow showers
    616: isDay ? "snow" : "snow-night", // Snow showers
    620: isDay ? "snow" : "snow-night", // Light snow showers
    621: isDay ? "snow" : "snow-night", // Snow showers
    622: isDay ? "snow" : "snow-night", // Heavy snow showers

    // Cloudy
    800: isDay ? "clouds" : "clouds-night", // Clear sky
    801: isDay ? "clouds" : "clouds-night", // Few clouds
    802: isDay ? "clouds" : "clouds-night", // Scattered clouds
    803: isDay ? "clouds" : "clouds-night", // Broken clouds
    804: isDay ? "clouds" : "clouds-night", // Overcast clouds
  };

  // Return the class based on the condition code, default to "clouds" if not found
  return weatherMap[conditionCode] || "clouds";
};

const weatherConditionsMap = {
  sunny: "sunny",
  clear: "sunny",
  "clear sky": "sunny",
  "few clouds": "clouds",
  "scattered clouds": "clouds",
  "broken clouds": "clouds",
  "partly cloudy": "clouds",
  cloudy: "clouds",
  overcast: "clouds",
  "overcast clouds": "clouds",
  mist: "fog",
  smoke: "fog",
  haze: "fog",
  dust: "fog",
  fog: "fog",
  sand: "fog",
  ash: "fog",
  "freezing fog": "fog",
  "patchy rain possible": "rain",
  "light rain": "rain",
  "moderate rain": "rain",
  "heavy intensity rain": "rain",
  "very heavy rain": "rain",
  "extreme rain": "rain",
  "shower rain": "rain",
  rain: "rain",
  thunderstorm: "rain",
  "thundery outbreaks possible": "rain",
  squall: "rain",
  tornado: "rain",
  "patchy light drizzle": "rain",
  "light drizzle": "rain",
  "moderate rain at times": "rain",
  "heavy rain at times": "rain",
  "torrential rain shower": "rain",
  "light rain shower": "rain",
  "moderate or heavy rain shower": "rain",
  "patchy light rain with thunder": "rain",
  "moderate or heavy rain with thunder": "rain",
  "patchy snow possible": "snow",
  "light snow": "snow",
  "moderate snow": "snow",
  "heavy snow": "snow",
  snow: "snow",
  "blowing snow": "snow",
  blizzard: "snow",
  "patchy sleet possible": "snow",
  "light sleet": "snow",
  "moderate or heavy sleet": "snow",
  "patchy freezing drizzle possible": "snow",
  "freezing drizzle": "snow",
  "heavy freezing drizzle": "snow",
  "light freezing rain": "snow",
  "moderate or heavy freezing rain": "snow",
  "ice pellets": "snow",
  "light sleet showers": "snow",
  "moderate or heavy sleet showers": "snow",
  "light snow showers": "snow",
  "moderate or heavy snow showers": "snow",
  "light showers of ice pellets": "snow",
  "moderate or heavy showers of ice pellets": "snow",
  "patchy light snow with thunder": "snow",
  "moderate or heavy snow with thunder": "snow",
  "light rain and snow": "snow",
  "rain and snow": "snow",
  "light shower sleet": "snow",
  "shower sleet": "snow",
  "light shower snow": "snow",
  "shower snow": "snow",
  "heavy shower snow": "snow",
  "clear night": "night",
  "partly cloudy night": "night",
  "cloudy night": "night",
  "overcast night": "night",
  "patchy rain nearby": "rain",

  night: "night",
};

const setBGImage = (weatherJson) => {
  // Extract the weather condition text
  const weatherCondition = weatherJson[0].day.condition.text.toLowerCase();
  // console.log(weatherCondition);

  const weatherClass = weatherConditionsMap[weatherCondition] || "default";

  // console.log("Setting background class to:", weatherClass);  Debug log

  document.documentElement.className = ""; // Clearing all classes

  document.documentElement.classList.add(weatherClass);
};

// const buildScreenReaderWeather = (weatherJson, locationObj) => {
//   const location = locationObj.getname();
//   const unit = locationObj.getunit();
//   const tempUnit = unit === "imperial" ? "Fahrenheit" : "Celsius";
//   return `${weatherJson.current.weather[0].description} and ${Math.round(
//     Number(weatherJson.current.temp)
//   )}°${tempUnit} in ${location}`;
// };

const fadeDisplay = () => {
  // Select elements
  const currentStatus = document.getElementById("forecast-status");
  const weekStatus = document.getElementById("weekly-status");

  // Check if elements exist before toggling their classes
  if (currentStatus) {
    currentStatus.classList.toggle("zero-visibility");
    currentStatus.classList.toggle("fade-in");
  } else {
    console.error('Element with id "forecast-status" not found.');
  }

  if (weekStatus) {
    weekStatus.classList.toggle("zero-visibility");
    weekStatus.classList.toggle("fade-in");
  } else {
    console.error('Element with id "weekly-status" not found.');
  }
};

const setFocusOnSearch = () => {
  document.getElementById("searchbar-text").focus();
};

const createCurrentConditionsDivs = (weatherObj, unit) => {
  const tempUnit = unit === "imperial" ? "F" : "C";
  const windUnit = unit === "imperial" ? "mph" : "kph";

  //   const icon = createMainImgDiv(
  //     weatherObj[0].day.condition.icon,
  //     weatherObj[0].day.condition.text
  //   );

  // Accessing the first day's data
  const firstDay = weatherObj[0];

  const temp = createElem(
    "div",
    "temp",
    `${Math.round(
      Number(
        unit === "imperial" ? firstDay.day.avgtemp_f : firstDay.day.avgtemp_c
      )
    )}°`,
    tempUnit
  );

  const icon = createMainImgDiv(
    firstDay.day.condition.icon,
    firstDay.day.condition.text
  );

  let properDesc = toProperCase(firstDay.day.condition.text);
  // console.log(properDesc);

  if (properDesc === "Sunny") {
    properDesc = "Sunny (Day) / Clear (Night)";
  }

  const desc = createElem("div", "desc", properDesc);
  const feels = createElem(
    "div",
    "feels",
    `Feels Like ${Math.round(Number(firstDay.day.avgtemp_c))}°`
  );
  const maxTemp = createElem(
    "div",
    "maxtemp",
    `High ${Math.round(
      Number(
        unit === "imperial" ? firstDay.day.maxtemp_f : firstDay.day.maxtemp_c
      )
    )}°`
  );
  const minTemp = createElem(
    "div",
    "mintemp",
    `Low ${Math.round(
      Number(
        unit === "imperial" ? firstDay.day.mintemp_f : firstDay.day.mintemp_c
      )
    )}°`
  );
  const humidity = createElem(
    "div",
    "humidity",
    `Humidity ${firstDay.day.avghumidity}%`
  );
  const wind = createElem(
    "div",
    "wind",
    `Wind ${Math.round(Number(firstDay.day.maxwind_kph))} ${windUnit}`
  );
  return [icon, temp, desc, feels, maxTemp, minTemp, humidity, wind];
};

const createMainImgDiv = (iconUrl, altText) => {
  const iconDiv = createElem("div", "icon");
  iconDiv.id = "icon";
  const img = document.createElement("img");
  img.src = iconUrl;
  img.alt = altText;
  img.title = altText;
  iconDiv.appendChild(img);
  return iconDiv;
};

const createElem = (elemType, divClassName, divText, unit) => {
  const div = document.createElement(elemType);
  div.className = divClassName;
  if (divText) {
    div.textContent = divText;
  }
  if (divClassName === "temp") {
    const unitDiv = document.createElement("div");
    unitDiv.className = "unit";
    unitDiv.textContent = unit;
    div.appendChild(unitDiv);
  }
  return div;
};

// If your API doesn't have icons

// const translateIconToFontAwesome = (icon) => {
//   const i = document.createElement("i");
//   const weatherMap = {
//     // Clear sky
//     "01d": "far fa-sun",
//     "01n": "far fa-moon",

//     // Few clouds
//     "02d": "fas fa-cloud-sun",
//     "02n": "fas fa-cloud-moon",

//     // Scattered clouds
//     "03d": "fas fa-cloud",
//     "03n": "fas fa-cloud",

//     // Broken clouds
//     "04d": "fas fa-cloud-meatball",
//     "04n": "fas fa-cloud-meatball",

//     // Shower rain
//     "09d": "fas fa-cloud-showers-heavy",
//     "09n": "fas fa-cloud-showers-heavy",

//     // Rain
//     "10d": "fas fa-cloud-sun-rain",
//     "10n": "fas fa-cloud-moon-rain",

//     // Thunderstorm
//     "11d": "fas fa-poo-storm",
//     "11n": "fas fa-poo-storm",

//     // Snow
//     "13d": "far fa-snowflake",
//     "13n": "far fa-snowflake",
//     // Mist / Smoke / Haze / Dust / Fog
//     "50d": "fas fa-smog",
//     "50n": "fas fa-smog",
//   };

//   const iconClass = weatherMap[icon] || "far fa-question-circle"; // Default if no match
//   i.classList.add(...iconClass.split(" "));
//   return i;
// };

const displayCurrentConditions = (ccArray) => {
  const ccContainer = document.getElementById("currentForecast-conditions");
  ccArray.forEach((cc) => {
    ccContainer.appendChild(cc);
  });
};

const updateBackground = (weatherCondition) => {
  const body = document.body;

  // Remove any existing weather classes
  body.classList.remove("rain", "fog", "snow", "night", "clouds");

  // Add the new weather class based on the condition
  switch (weatherCondition.toLowerCase()) {
    case "rain":
      body.classList.add("rain");
      break;
    case "fog":
      body.classList.add("fog");
      break;
    case "snow":
      body.classList.add("snow");
      break;
    case "night":
      body.classList.add("night");
      break;
    case "clouds":
      body.classList.add("clouds");
      break;
    default:
      // You can add more cases or a default background
      break;
  }
};

//   const processWeatherData = (weatherData) => {
//     const weatherCondition = weatherData.current.condition.text;
//     updateBackground(weatherCondition);
//   };

const addSpinner = (element) => {
  animateBtn(element);
  setTimeout(animateBtn, 1000, element);
};

const clearDisplay = () => {
  const currentConditions = document.getElementById(
    "currentForecast-conditions"
  );
  deleteContents(currentConditions);

  const weeklyConditions = document.getElementById("weekly-content");
  deleteContents(weeklyConditions);
};

const deleteContents = (parentElement) => {
  let child = parentElement.lastElementChild;
  while (child) {
    parentElement.removeChild(child);
    child = parentElement.lastElementChild;
  }
};

const displayWeeklyForecast = (weatherJson) => {
  if (Array.isArray(weatherJson)) {
    for (let i = 1; i < 7; i++) {
      // Adjusted to loop from 0 to 5
      if (weatherJson[i]) {
        const dfArray = createDailyForecastDivs(
          weatherJson[i],
          currentLoc.getunit()
        );
        displayDailyForecast(dfArray);
      } else {
        console.error(`No data available for day index: ${i}`);
      }
    }
  } else {
    console.error("Invalid weatherJson structure:", weatherJson);
  }
};

const createDailyForecastDivs = (dayWeather, unit) => {
  const dayAbbreviationText = getDayAbbreviation(dayWeather.date_epoch);
  const dayAbbreviation = createElem(
    "p",
    "dayAbbreviation",
    dayAbbreviationText
  );
  const dayIcon = createDailyForecastIcon(
    dayWeather.day.condition.icon,
    dayWeather.day.condition.text
  );
  const dayHigh = createElem(
    "p",
    "dayHigh",
    `${Math.round(
      Number(
        unit === "imperial"
          ? dayWeather.day.maxtemp_f
          : dayWeather.day.maxtemp_c
      )
    )}°`
  );
  const dayLow = createElem(
    "p",
    "dayLow",
    `${Math.round(
      Number(
        unit === "imperial"
          ? dayWeather.day.mintemp_f
          : dayWeather.day.mintemp_c
      )
    )}°`
  );
  return [dayAbbreviation, dayIcon, dayHigh, dayLow];
};

const getDayAbbreviation = (data) => {
  const dateObj = new Date(data * 1000);
  const utcString = dateObj.toUTCString();
  return utcString.slice(0, 3).toUpperCase();
};

const createDailyForecastIcon = (icon, altText) => {
  const img = document.createElement("img");
  img.src = `https:${icon}`;
  img.alt = altText;
  return img;
};

const displayDailyForecast = (dfArray) => {
  const dayDiv = createElem("div", "forecastDay");
  dfArray.forEach((el) => {
    dayDiv.appendChild(el);
  });
  const dailyForecastContainer = document.getElementById("weekly-content");
  dailyForecastContainer.appendChild(dayDiv);
};

const animateBtn = (element) => {
  element.classList.toggle("none");
  element.nextElementSibling.classList.toggle("block");
  element.nextElementSibling.classList.toggle("none");
};

//Data Functions

// const setPlaceholderText = () => {
//   const input = document.getElementById("searchbar-text");
//   window.innerWidth < 400
//     ? (input.placeholder = "City, State or Country.")
//     : (input.placeholder = "City, State, Country or ZIP Code.");
// };

const setLocationObject = (locationObj, coordsObj) => {
  const { lat, lon, name, unit } = coordsObj;

  locationObj.setlat(lat);
  locationObj.setlon(lon);
  locationObj.setname(name);

  if (unit) {
    locationObj.setunit(unit);
  }
};

const getHomeLocation = () => {
  return localStorage.getItem("defaultWeatherLocation");
};

const cleanText = (text) => {
  const regex = / {2,}/g;
  const entryText = text.replaceAll(regex, " ").trim();
  return entryText;
};

const getWeatherFromCoords = async (locationObj) => {
  const lat = locationObj.getlat();
  const lon = locationObj.getlon();
  const apiKey = "4c87d7e73cb74fedacc81054241509 ";

  const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${lat},${lon}&days=7`;

  try {
    const response = await fetch(url);
    const weatherJson = await response.json();

    if (weatherJson.forecast) {
      return weatherJson.forecast.forecastday; // Get forecast for the next 6 days
    } else {
      throw new Error("No forecast data available.");
    }
  } catch (err) {
    console.error("Error fetching weather data:", err);
    return null;
  }
};
