# White Wave

## Overview
White Wave is a mindfulness and focus application designed to help users create their perfect soundscape. Whether you're studying, working, or simply unwinding, White Wave allows you to mix and match various ambient sounds to enhance your concentration and relaxation.

## Features
- **Sound Mixing**: Combine multiple ambient sounds to create a personalized audio experience.
- **Volume Control**: Adjust the volume of each sound individually for a tailored mix.
- **Preset Mixes**: Save your favorite sound combinations for easy access later.
- **Theme Toggle**: Switch between light and dark modes for a comfortable viewing experience.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Credits and Attributions**: Acknowledge the creators of the sounds and resources used in the app.

## Sounds Available
- Fire Crackling
- Underwater Sounds
- Lo-Fi Music
- Coffee Shop Ambiance
- Keyboard Typing Sounds
- Waves

## Usage
1. Launch the application in your browser.
2. Select sounds from the available options.
3. Adjust the volume sliders to your preference.
4. Save your favorite mixes for future use.
5. Enjoy a calming audio experience tailored to your needs.

## Run Locally (Docker)

- Build and start Nginx container (serves `app/`): `docker-compose up --build`
- Open: `http://localhost:8284`
- Stop: `docker-compose down`

## Chrome Extension (Optional)

The `chrome-extension/` folder contains an MV3 extension that provides quick access to favorite sounds and can import your saved mixes from the website.

- Chrome → `chrome://extensions` → enable Developer Mode
- “Load unpacked” → select `chrome-extension/`
- To import mixes: open White Wave in a tab (production or localhost) → click **Import** in the extension → play mixes from the **Mixes** tab

## Contributing
Contributions are welcome! If you have suggestions for improvements or new features, feel free to open an issue or submit a pull request.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author
Made by [Ulrich Raab](https://ulrichraab.eu). Feel free to reach out for any inquiries or collaborations!

## Acknowledgments
- Special thanks to the creators of the sound effects and libraries used in this project.
- Built with [TailwindCSS](https://tailwindcss.com/) for styling and [Font Awesome](https://fontawesome.com/) for icons.
