'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let map, mapEvent;

class Workout {
  // date = new Date()
  // id = (new Date() + '').slice(-10)

  constructor(coords, distance, duration) {
    this.date = new Date();
    this.id = (Date.now() + '').slice(-10);
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  // type = 'running'
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.type = 'running';
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.type = 'cycling';
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const running = new Running([12, 0.1], 5, 30, 200);
// const cycling = new Cycling([17, 89.1], 10, 20, 523);
// console.log(running, cycling);

///////////////////////////////////////////////////////
// Application Architecture
class App {
  // Private fields
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get current position
    this._getPosition();

    // Get data from local storage when loading the page
    this._getLocalStorage();

    // Add event listener when loading page
    // 在类中的eventHandler中的函数一般都要改成bind（this）
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Position not found');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // Helper function for inputs validation

    const allNumbers = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    // 1. Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;

    // 2. Check if data is valid
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !allNumbers(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        console.log(allNumbers(distance, duration, cadence)); // undefined
        return alert('Inputs have to be valid numbers!');
      } else {
        // 3. If workout running, create running object
        workout = new Running([lat, lng], distance, duration, cadence);
      }
    }

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;
      if (
        !allNumbers(distance, duration, elevationGain) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be valid numbers!');
      } else {
        // 4. If workout cycling, create cycling object
        workout = new Cycling([lat, lng], distance, duration, elevationGain);
      }
    }

    // 5. Add new workout to array
    this.#workouts.push(workout);

    // 6. Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // 7. Render workout on list
    this._renderWorkout(workout);

    // 8. Hide form and clear input fields
    this._hideForm();

    // 9. set workout to local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    console.log(data);

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // _renderWorkoutlist(workout) {
  //   const html = `
  //     <li class="workout workout--${workout.type}" data-id=${workout.id}>
  //         <h2 class="workout__title">${workout.description}</h2>
  //         <div class="workout__details">
  //           <span class="workout__icon">${
  //             workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
  //           }</span>
  //           <span class="workout__value">${workout.distance}</span>
  //           <span class="workout__unit">km</span>
  //         </div>
  //         <div class="workout__details">
  //           <span class="workout__icon">⏱</span>
  //           <span class="workout__value">${workout.duration}</span>
  //           <span class="workout__unit">min</span>
  //         </div>
  //         <div class="workout__details">
  //           <span class="workout__icon">⚡️</span>
  //           <span class="workout__value">${workout.pace}</span>
  //           <span class="workout__unit">km/h</span>
  //         </div>
  //         <div class="workout__details">
  //           <span class="workout__icon">⛰</span>
  //           <span class="workout__value">${workout.cadence}</span>
  //           <span class="workout__unit">m</span>
  //         </div>
  //       </li>
  //     `;
  //   containerWorkouts.insertAdjacentHTML('afterbegin', html);
  // }
}

const app = new App();
