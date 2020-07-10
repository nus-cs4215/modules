/**
 * Game library that translates Phaser 3 API into Source.
 *
 * More in-depth explanation of the Phaser 3 API can be found at
 * Phaser 3 documentation itself.
 *
 * For Phaser 3 API Documentation, check:
 * https://photonstorm.github.io/phaser3-docs/
 *
 * Author: Anthony Halim, Chong Sia Tiffany
 */

(_params) => {
  const Phaser = _params.phaser;
  const scene = _params.scene;
  const preload_image_map = _params.preloadImageMap;
  const preload_sound_map = _params.preloadSoundMap;
  const remote_path = _params.remotePath;

  const type_key = "type";

  const image_type = "image";
  const text_type = "text";
  const rect_type = "rect";
  const ellipse_type = "ellipse";
  const container_type = "container";
  const obj_types = [
    image_type,
    text_type,
    rect_type,
    ellipse_type,
    container_type,
  ];

  const null_str = "";
  const null_fn = () => {};

  ///////////////////////////
  //        PRIVATE        //
  ///////////////////////////

  /**
   * Checks whether the given game object is of the enquired type.
   * @param {Phaser.GameObjects.Container} obj the game object
   * @param {string} type enquired type
   * @returns {boolean}
   */
  function is_type(obj, type) {
    return obj.data.get(type_key) === type;
  }

  /**
   * Checks whether the given game object is any of the enquired types
   *
   * @param {Phaser.GameObjects.Container} obj the game object
   * @param {string[]} types enquired types
   * @returns {boolean}
   */
  function is_any_type(obj, types) {
    for (let i = 0; i < types.length; i++) {
      if (is_type(obj, types[i])) return true;
    }
    return false;
  }

  /**
   * Set a game object to the given type. Overwrites previous type, if any.
   * Mutates the object.
   *
   * @param {Phaser.GameObjects.Container} obj the game object
   * @param {string} type type to set
   * @returns {Phaser.GameObjects.Container} object itself
   */
  function set_type(obj, type) {
    obj.setDataEnabled();
    obj.data.set(type_key, type);
    return obj;
  }

  /**
   * Throw a console error, including the function caller name.
   *
   * @param {string} message error message
   */
  function throw_error(message) {
    throw console.error(`${arguments.callee.caller.name}: ${message}`);
  }

  ///////////////////////////
  //        HELPER         //
  ///////////////////////////

  /**
   * Prepend the given asset key with the remote path (S3 path).
   *
   * @param {string} asset_key
   * @returns {string} prepended path
   */
  function prepend_remote_url(asset_key) {
    return remote_path + asset_key;
  }

  ///////////////////////////
  //        CONFIG         //
  ///////////////////////////

  /**
   * Transforms the given list into config object. The list follows
   * the format of list([key1, value1], [key2, value2]).
   *
   * e.g list(["alpha", 0], ["duration", 1000])
   *
   * @param {list} lst the list to be turned into config object.
   * @returns {config} config object
   */
  function create_config(lst) {
    const config = {};
    map((xs) => {
      if (!is_pair(xs)) {
        throw_error(`xs is not pair!`);
      }
      config[head(xs)] = tail(xs);
    }, lst);
    return config;
  }

  /**
   * Create text config object, can be used to stylise text object.
   *
   * font_family: for available font_family, see:
   * https://developer.mozilla.org/en-US/docs/Web/CSS/font-family#Valid_family_names
   *
   * align: must be either 'left', 'right', 'center', or 'justify'
   *
   * For more details about text config, see:
   * https://photonstorm.github.io/phaser3-docs/Phaser.Types.GameObjects.Text.html#.TextStyle
   *
   * @param {string} font_family font to be used
   * @param {string} font_size size of font, must be appended with 'px' e.g. '16px'
   * @param {string} color colour of font, in hex e.g. '#fff'
   * @param {string} stroke colour of stroke, in hex e.g. '#fff'
   * @param {number} stroke_thickness thickness of stroke
   * @param {number} align text alignment
   * @returns {config} text config
   */
  function create_text_config(
    font_family = "Courier",
    font_size = "16px",
    color = "#fff",
    stroke = "#fff",
    stroke_thickness = 0,
    align = "left"
  ) {
    const lst = list(
      ["fontFamily", font_family],
      ["fontSize", font_size],
      ["color", color],
      ["stroke", stroke],
      ["strokeThickness", stroke_thickness],
      ["align", align]
    );
    return create_config(lst);
  }

  /**
   * Create interactive config object, can be used to configure interactive settings.
   *
   * For more details about interactive config object, see:
   * https://photonstorm.github.io/phaser3-docs/Phaser.Types.Input.html#.InputConfiguration
   *
   * @param {boolean} draggable object will be set draggable
   * @param {boolean} use_hand_cursor if true, pointer will be set to 'pointer' when a pointer is over it
   * @param {boolean} pixel_perfect pixel perfect function will be set for the hit area. Only works for texture based object
   * @param {number} alpha_tolerance if pixel_perfect is set, this is the alpha tolerance threshold value used in the callback
   * @returns {config} interactive config
   */
  function create_interactive_config(
    draggable = false,
    use_hand_cursor = false,
    pixel_perfect = false,
    alpha_tolerance = 1
  ) {
    const lst = list(
      ["draggable", draggable],
      ["useHandCursor", use_hand_cursor],
      ["pixelPerfect", pixel_perfect],
      ["alphaTolerance", alpha_tolerance]
    );
    return create_config(lst);
  }

  /**
   * Create sound config object, can be used to configure sound settings.
   *
   * For more details about sound config object, see:
   * https://photonstorm.github.io/phaser3-docs/Phaser.Types.Sound.html#.SoundConfig
   *
   * @param {boolean} mute whether the sound should be muted or not
   * @param {number} volume value between 0(silence) and 1(full volume)
   * @param {number} rate the speed at which the sound is played
   * @param {number} detune detuning of the sound, in cents
   * @param {number} seek position of playback for the sound, in seconds
   * @param {boolean} loop whether or not the sound should loop
   * @param {number} delay time, in seconds, that elapse before the sound actually starts
   * @returns {config} sound config
   */
  function create_sound_config(
    mute = false,
    volume = 1,
    rate = 1,
    detune = 0,
    seek = 0,
    loop = false,
    delay = 0
  ) {
    const lst = list(
      ["mute", mute],
      ["volume", volume],
      ["rate", rate],
      ["detune", detune],
      ["seek", seek],
      ["loop", loop],
      ["delay", delay]
    );
    return create_config(lst);
  }

  /**
   * Create tween config object, can be used to configure tween settings.
   *
   * For more details about tween config object, see:
   * https://photonstorm.github.io/phaser3-docs/Phaser.Types.Tweens.html#.TweenBuilderConfig
   *
   * @param {string} target_prop target to tween, e.g. x, y, alpha
   * @param {string | number} target_value the property value to tween to
   * @param {number} delay time in ms/frames before tween will start
   * @param {number} duration duration of tween in ms/frames, exclude yoyos or repeats
   * @param {Function | string} ease ease function to use, e.g. 'Power0', 'Power1', 'Power2'
   * @param {Function} on_complete function to execute when tween completes
   * @param {boolean} yoyo if set to true, once tween complete, reverses the values incrementally to get back to the starting tween values
   * @param {number} loop number of times the tween should loop, or -1 to loop indefinitely
   * @param {number} loop_delay The time the tween will pause before starting either a yoyo or returning to the start for a repeat
   * @param {Function} on_loop function to execute each time the tween loops
   * @returns {config} tween config
   */
  function create_tween_config(
    target_prop = "x",
    target_value = 0,
    delay = 0,
    duration = 1000,
    ease = "Power0",
    on_complete = null_fn,
    yoyo = false,
    loop = 0,
    loop_delay = 0,
    on_loop = null_fn
  ) {
    const lst = list(
      [target_prop, target_value],
      ["delay", delay],
      ["duration", duration],
      ["ease", ease],
      ["onComplete", on_complete],
      ["yoyo", yoyo],
      ["loop", loop],
      ["loopDelay", loop_delay],
      ["onLoop", on_loop]
    );
    return create_config(lst);
  }

  ///////////////////////////
  //        SCREEN         //
  ///////////////////////////

  /**
   * Get in-game screen width.
   *
   * @return {number} screen width
   */
  function get_screen_width() {
    return 1920;
  }

  /**
   * Get in-game screen height.
   *
   * @return {number} screen height
   */
  function get_screen_height() {
    return 1080;
  }

  /**
   * Get game screen display width (accounting window size).
   *
   * @return {number} screen display width
   */
  function get_screen_display_width() {
    return scene.scale.displaySize.width;
  }

  /**
   * Get game screen display height (accounting window size).
   *
   * @return {number} screen display height
   */
  function get_screen_display_height() {
    return scene.scale.displaySize.height;
  }

  ///////////////////////////
  //          LOAD         //
  ///////////////////////////

  /**
   * Load the image asset into the scene for use. All images
   * must be loaded before used in create_image.
   *
   * @param {string} key key to be associated with the image
   * @param {string} url path to the image
   */
  function load_image(key, url) {
    preload_image_map.set(key, url);
  }

  /**
   * Load the sound asset into the scene for use. All sound
   * must be loaded before used in play_sound.
   *
   * @param {string} key key to be associated with the sound
   * @param {string} url path to the sound
   */
  function load_sound(key, url) {
    preload_sound_map.set(key, url);
  }

  ///////////////////////////
  //          ADD          //
  ///////////////////////////

  /**
   * Add the object to the scene. Only object added to the scene
   * will appear.
   *
   * @param {Phaser.GameObjects.Container} obj game object to be added
   */
  function add(obj) {
    if (obj && is_any_type(obj, obj_types)) {
      scene.add.existing(obj);
      return obj;
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  ///////////////////////////
  //         SOUND         //
  ///////////////////////////

  /**
   * Play the sound associated with the key.
   * Throws error if key is non-existent.
   *
   * @param {string} key key to the sound to be played
   * @param {config} config sound config to be used
   */
  function play_sound(key, config = {}) {
    if (preload_sound_map.get(key)) {
      scene.sound.play(key, config);
    } else {
      throw_error(`${key} is not associated with any sound`);
    }
  }

  ///////////////////////////
  //         IMAGE         //
  ///////////////////////////

  /**
   * Create an image using the key associated with a loaded image.
   * If key is not associated with any loaded image, throws error.
   *
   * 0, 0 is located at the top, left hand side.
   *
   * @param {number} x x position of the image. 0 is at the left side
   * @param {number} y y position of the image. 0 is at the top side
   * @param {string} asset_key key to loaded image
   * @returns {Phaser.GameObjects.Container} image game object
   */
  function create_image(x, y, asset_key) {
    if (preload_image_map.get(asset_key)) {
      const image = new Phaser.GameObjects.Sprite(scene, x, y, asset_key);
      return set_type(image, image_type);
    } else {
      throw_error(`${asset_key} is not associated with any image`);
    }
  }

  ///////////////////////////
  //         TEXT          //
  ///////////////////////////

  /**
   * Create a text object.
   *
   * 0, 0 is located at the top, left hand side.
   *
   * @param {number} x x position of the text
   * @param {number} y y position of the text
   * @param {string} text text to be shown
   * @param {config} config text configuration to be used
   * @returns {Phaser.GameObjects.Container} text game object
   */
  function create_text(x, y, text, config = {}) {
    const txt = new Phaser.GameObjects.Text(scene, x, y, text, config);
    return set_type(txt, text_type);
  }

  ///////////////////////////
  //       RECTANGLE       //
  ///////////////////////////

  /**
   * Create a rectangle object.
   *
   * 0, 0 is located at the top, left hand side.
   *
   * @param {number} x x coordinate of the top, left corner posiiton
   * @param {number} y y coordinate of the top, left corner position
   * @param {number} width width of rectangle
   * @param {number} height height of rectangle
   * @param {number} fill colour fill, in hext e.g 0xffffff
   * @param {number} alpha value between 0 and 1 to denote alpha
   * @returns {Phaser.GameObjects.Container} rectangle object
   */
  function create_rect(x, y, width, height, fill = 0, alpha = 1) {
    const rect = new Phaser.GameObjects.Rectangle(
      scene,
      x,
      y,
      width,
      height,
      fill,
      alpha
    );
    return set_type(rect, rect_type);
  }

  ///////////////////////////
  //        ELLIPSE        //
  ///////////////////////////

  /**
   * Create an ellipse object.
   *
   * @param {number} x x coordinate of the centre of ellipse
   * @param {number} y y coordinate of the centre of ellipse
   * @param {number} width width of ellipse
   * @param {number} height height of ellipse
   * @param {number} fill colour fill, in hext e.g 0xffffff
   * @param {number} alpha value between 0 and 1 to denote alpha
   * @returns {Phaser.GameObjects.Container} ellipse object
   */
  function create_ellipse(x, y, width, height, fill = 0, alpha = 1) {
    const ellipse = new Phaser.GameObjects.Ellipse(
      scene,
      x,
      y,
      width,
      height,
      fill,
      alpha
    );
    return set_type(ellipse, ellipse_type);
  }

  ///////////////////////////
  //       CONTAINER       //
  ///////////////////////////

  /**
   * Create a container object. Container is able to contain any other game object,
   * and the positions of contained game object will be relative to the container.
   *
   * Rendering the container as visible or invisible will also affect the contained
   * game object.
   *
   * Container can also contain another container.
   *
   * 0, 0 is located at the top, left hand side.
   *
   * For more details about container object, see:
   * https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Container.html
   *
   * @param {number} x x position of the container
   * @param {number} y y position of the container
   * @returns {Phaser.GameObjects.Container} container object
   */
  function create_container(x, y) {
    const cont = new Phaser.GameObjects.Container(scene, x, y);
    return set_type(cont, container_type);
  }

  /**
   * Add the given game object to the container.
   * Mutates the container.
   *
   * @param {Phaser.GameObject.GameObject} container container object
   * @param {Phaser.GameObject.GameObject} objs game object to add to the container
   * @returns {Phaser.GameObject.GameObject} container object
   */
  function add_to_container(container, obj) {
    const correct_types =
      is_type(container, container_type) && is_any_types(obj, obj_types);
    if (container && obj && correct_types) {
      return container.add(obj);
    } else {
      throw_error(
        `${obj} is not of type ${obj_types} or ${container} is not of type ${container_type}`
      );
    }
  }

  ///////////////////////////
  //         OBJECT        //
  ///////////////////////////

  /**
   * Set the display size of the object.
   * Mutate the object.
   *
   * @param {Phaser.GameObjects.Container} obj object to be set
   * @param {number} x new display width size
   * @param {number} y new display height size
   * @returns {Phaser.GameObjects.Container} game object itself
   */
  function set_display_size(obj, x, y) {
    if (obj && is_any_type(obj, obj_types)) {
      return obj.setDisplaySize(x, y);
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  /**
   * Set the alpha of the object.
   * Mutate the object.
   *
   * @param {Phaser.GameObjects.Container} obj object to be set
   * @param {number} alpha new alpha
   * @returns {Phaser.GameObjects.Container} game object itself
   */
  function set_alpha(obj, alpha) {
    if (obj && is_any_type(obj, obj_types)) {
      return obj.setAlpha(alpha);
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  /**
   * Set the interactivity of the object.
   * Mutate the object.
   *
   * Rectangle and Ellipse are not able to receive configs, only boolean
   * i.e. set_interactive(rect, true); set_interactive(ellipse, false)
   *
   * @param {Phaser.GameObjects.Container} obj object to be set
   * @param {config} config interactive config to be used
   * @returns {Phaser.GameObjects.Container} game object itself
   */
  function set_interactive(obj, config = {}) {
    if (obj && is_any_type(obj, obj_types)) {
      return obj.setInteractive(config);
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  /**
   * Set the origin in which all position related will be relative to.
   * In other words, the anchor of the object.
   * Mutate the object.
   *
   * @param {Phaser.GameObjects.Container} obj object to be set
   * @param {number} x new anchor x coordinate, between value 0 to 1.
   * @param {number} y new anchor y coordinate, between value 0 to 1.
   * @returns {Phaser.GameObjects.Container} game object itself
   */
  function set_origin(obj, x, y) {
    if (obj && is_any_type(obj, obj_types)) {
      return obj.setOrigin(x, y);
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  /**
   * Set the scale of the object.
   * Mutate the object.
   *
   * @param {Phaser.GameObjects.Container} obj object to be set
   * @param {number} x new x scale
   * @param {number} y new y scale
   * @returns {Phaser.GameObjects.Container} game object itself
   */
  function set_scale(obj, x, y) {
    if (obj && is_any_type(obj, obj_types)) {
      return obj.setScale(x, y);
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  /**
   * Set the rotation of the object.
   * Mutate the object.
   *
   * @param {Phaser.GameObjects.Container} obj object to be set
   * @param {number} rad the rotation, in radians
   * @returns {Phaser.GameObjects.Container} game object itself
   */
  function set_rotation(obj, rad) {
    if (obj && is_any_type(obj, obj_types)) {
      return obj.setRotation(rad);
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  /**
   * Sets the horizontal and flipped state of the object.
   * Mutate the object.
   *
   * @param {Phaser.GameObjects.Container} obj game object itself
   * @param {boolean} x to flip in the horizontal state
   * @param {boolean} y to flip in the vertical state
   * @returns {Phaser.GameObjects.Container} game object itself
   */
  function set_flip(obj, x, y) {
    if (obj && is_any_type(obj, obj_types)) {
      return obj.setFlip(x, y);
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  /**
   * Attach a listener to the object. The callback will be executed
   * when the event is emitted.
   * Mutate the object.
   *
   * For all available events, see:
   * https://photonstorm.github.io/phaser3-docs/Phaser.Input.Events.html
   *
   * @param {Phaser.GameObjects.Container} obj object to be added to
   * @param {string} event the event name
   * @param {Function} callback listener function
   * @returns {Phaser.GameObjects.Container} game object itself
   */
  function add_listener(obj, event, callback) {
    if (obj && is_any_type(obj, obj_types)) {
      obj.addListener(event, callback);
      return obj;
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  /**
   * Create a tween to the object and plays it.
   * Mutate the object.
   *
   * @param {Phaser.GameObjects.Container} obj object to be added to
   * @param {config} config tween config
   * @returns {Phaser.GameObjects.Container} game object itself
   */
  async function add_tween(obj, config = {}) {
    if (obj && is_any_type(obj, obj_types)) {
      scene.tweens.add({
        targets: obj,
        ...config,
      });
      return obj;
    } else {
      throw_error(`${obj} is not of type ${obj_types}`);
    }
  }

  const functions = {
    add: add,
    add_listener: add_listener,
    add_to_container: add_to_container,
    add_tween: add_tween,
    create_config: create_config,
    create_container: create_container,
    create_ellipse: create_ellipse,
    create_image: create_image,
    create_interactive_config: create_interactive_config,
    create_rect: create_rect,
    create_text: create_text,
    create_text_config: create_text_config,
    create_tween_config: create_tween_config,
    create_sound_config: create_sound_config,
    get_screen_width: get_screen_width,
    get_screen_height: get_screen_height,
    get_screen_display_width: get_screen_display_width,
    get_screen_display_height: get_screen_display_height,
    load_image: load_image,
    load_sound: load_sound,
    play_sound: play_sound,
    prepend_remote_url: prepend_remote_url,
    set_alpha: set_alpha,
    set_display_size: set_display_size,
    set_flip: set_flip,
    set_interactive: set_interactive,
    set_origin: set_origin,
    set_rotation: set_rotation,
    set_scale: set_scale,
  };

  let final_functions = {};

  Object.entries(functions).map(([key, fn]) => {
    final_functions[key] = !Phaser || !scene ? null_fn : fn;
  });

  return final_functions;
}