/**
 * # ChernoffFaces
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Displays multidimensional data in the shape of a Chernoff Face.
 *
 * www.nodegame.org
 */
(function(node) {

    "use strict";

    var J = node.JSUS;
    var Table = node.window.Table;

    node.widgets.register('ChernoffFaces', ChernoffFaces);

    // ## Meta-data

    ChernoffFaces.version = '0.6.1';
    ChernoffFaces.description =
        'Display parametric data in the form of a Chernoff Face.';

    ChernoffFaces.title = 'ChernoffFaces';
    ChernoffFaces.className = 'chernofffaces';

    // ## Dependencies
    ChernoffFaces.dependencies = {
        JSUS: {},
        Table: {},
        Canvas: {},
        SliderControls: {}
    };

    ChernoffFaces.FaceVector = FaceVector;
    ChernoffFaces.FacePainter = FacePainter;
    ChernoffFaces.width = 100;
    ChernoffFaces.height = 100;
    ChernoffFaces.onChange = 'CF_CHANGE';

    /**
     * ## ChernoffFaces constructor
     *
     * Creates a new instance of ChernoffFaces
     *
     * @see Canvas constructor
     */
    function ChernoffFaces(options) {
        var that = this;

        // ## Public Properties

        // ### ChernoffFaces.options
        // Configuration options
        this.options = null;

        // ### ChernoffFaces.table
        // The table containing everything
        this.table = null;

        // ### ChernoffFaces.sc
        // The slider controls of the interface
        // Can be set manually via options.controls.
        // @see SliderControls
        this.sc = null;

        // ### ChernoffFaces.fp
        // The object generating the Chernoff faces
        // @see FacePainter
        this.fp = null;

        // ### ChernoffFaces.canvas
        // The HTMLElement canvas where the faces are created
        this.canvas = null;

        // ### ChernoffFaces.onChange
        // Name of the event to emit to update the canvas (falsy disabled)
        this.onChange = null;

        // ### ChernoffFaces.onChangeCb
        // Updates the canvas when the onChange event is emitted
        this.onChangeCb = function(f, updateControls) {
            var updateControls;
            // Draw what passed as parameter,
            // or what is the current value of sliders,
            // or a random face.
            if (!f && that.sc) {
                f = that.sc.getAllValues();
                if ('undefined' === typeof updateControls) {
                    updateControls = false;
                }
            }
            else {
                f = FaceVector.random();
            }
            that.draw(f, updateControls);
        };

        // ### ChernoffFaces.features
        // The object containing all the features to draw Chernoff faces
        this.features = null;
    }

    /**
     * ### ChernoffFaces.init
     *
     * Inits the widget
     *
     * Stores the reference to options, most of the operations are done
     * by the `append` method.
     *
     * @param {object} options Configuration options. Accepted options:
     *
     * - canvas {object} containing all options for canvas
     *
     * - width {number} width of the canvas (read only if canvas is not set)
     *
     * - height {number} height of the canvas (read only if canvas is not set)
     *
     * - features {FaceVector} vector of face-features. Default: random
     *
     * - onChange {string|boolean} The name of the event that will trigger
     *      redrawing the canvas, or null/false to disable event listener
     *
     * - controls {object|false} the controls (usually a set of sliders)
     *      offering the user the ability to manipulate the canvas. If equal
     *      to false no controls will be created. Default: SlidersControls.
     *      Any custom implementation must provide the following methods:
     *
     *          - getAllValues: returns the current features vector
     *          - refresh: redraws the current feature vector
     *          - init: accepts a configuration object containing a
     *               features and onChange as specified above.
     *
     */
    ChernoffFaces.prototype.init = function(options) {
        var controlsOptions, f;

        this.options = options;

        // Face Painter.
        this.features = options.features || this.features ||
            FaceVector.random();

        // Draw features, if facepainter was already created.
        if (this.fp) this.fp.draw(new FaceVector(this.features));

        // onChange event.
        if (options.onChange === false || options.onChange === null) {
            if (this.onChange) {
                node.off(this.onChange, this.onChangeCb);
                this.onChange = null;
            }
        }
        else {
            this.onChange = 'undefined' === typeof options.onChange ?
                ChernoffFaces.onChange : options.onChange;
            node.on(this.onChange, this.onChangeCb);
        }
    };

    /**
     * ## ChernoffFaces.getCanvas
     *
     * Returns the reference to current wrapper Canvas object
     *
     * To get to the HTML Canvas element use `canvas.canvas`.
     *
     * @return {Canvas} Canvas object
     *
     * @see Canvas
     */
    ChernoffFaces.prototype.getCanvas = function() {
        return this.canvas;
    };

    /**
     * ## ChernoffFaces.append
     *
     * Appends the widget
     *
     * Creates table, canvas, face painter (fp) and controls (sc), according
     * to current options.
     *
     * @see ChernoffFaces.fp
     * @see ChernoffFaces.sc
     * @see ChernoffFaces.table
     * @see Table
     * @see Canvas
     * @see SliderControls
     * @see FacePainter
     * @see FaceVector
     */
    ChernoffFaces.prototype.append = function() {
        var tblOptions, options;

        options = this.options;

        // Table.
        tblOptions = {};
        if (this.id) tblOptions.id = this.id;
        else if (this.id !== false) tblOptions.id = 'cf_table';

        if ('string' === typeof options.className) {
            tblOptions.id = options.className;
        }
        else if (options.className !== false) {
            tblOptions.className = 'cf_table';
        }

        this.table = new Table(tblOptions);

        // Canvas.
        if (!options.canvas) {
            options.canvas = {};
            if ('undefined' !== typeof options.height) {
                options.canvas.height = options.height;
            }
            if ('undefined' !== typeof options.width) {
                options.canvas.width = options.width;
            }
        }
        this.canvas = W.getCanvas('ChernoffFaces_canvas', options.canvas);

        // Face Painter.
        this.fp = new FacePainter(this.canvas);
        this.fp.draw(new FaceVector(this.features));

        // Controls.
        if ('undefined' === typeof options.controls || options.controls) {
            // Sc options.
            f = J.mergeOnKey(FaceVector.defaults, this.features, 'value');
            controlsOptions = {
                id: 'cf_controls',
                features: f,
                onChange: this.onChange,
                submit: 'Send'
            };
            // Create them.
            if ('object' === typeof options.controls) {
                this.sc = options.controls;
            }
            else {
                this.sc = node.widgets.get('SliderControls', controlsOptions);
            }
        }

        // Table.
        if (this.sc) this.table.addRow([this.sc, this.canvas]);
        else this.table.add(this.canvas);

        // Create and append table.
        this.table.parse();
        this.bodyDiv.appendChild(this.table.table);
    };

    /**
     * ### ChernoffFaces.draw
     *
     * Draw a face on canvas and optionally updates the controls
     *
     * @param {object} features The features to draw
     * @param {boolean} updateControls Optional. If equal to false,
     *    controls are not updated. Default: true
     *
     * @see ChernoffFaces.sc
     */
    ChernoffFaces.prototype.draw = function(features, updateControls) {
        var fv;
        if (!features) return;
        updateControls =
            'undefined' === typeof updateControls ? true : updateControls;
        fv = new FaceVector(features);
        this.fp.redraw(fv);
        if (this.sc && updateControls) {
            // Without merging wrong values are passed as attributes.
            this.sc.init({
                features: J.mergeOnKey(FaceVector.defaults, features, 'value')
            });
            this.sc.refresh();
        }
    };

    ChernoffFaces.prototype.getAllValues = function() {
        return this.fp.face;
    };

     /**
     * ### ChernoffFaces.randomize
     *
     * Draws a random image and updates controls accordingly (if found)
     *
     * @see ChernoffFaces.sc
     */
    ChernoffFaces.prototype.randomize = function() {
        var fv;
        fv = FaceVector.random();
        this.fp.redraw(fv);
        // If controls are visible, updates them.
        if (this.sc) {
            this.sc.init({
                features: J.mergeOnValue(FaceVector.defaults, fv),
                onChange: this.onChange
            });
            this.sc.refresh();
        }
        return true;
    };


    /**
     * # FacePainter
     *
     * Draws faces on a Canvas
     *
     * @param {HTMLCanvas} canvas The canvas
     * @param {object} settings Optional. Settings (not used).
     */
    function FacePainter(canvas, settings) {

        /**
         * ### FacePainter.canvas
         *
         * The wrapper element for the HTML canvas
         *
         * @see Canvas
         */
        this.canvas = new W.Canvas(canvas);

        /**
         * ### FacePainter.scaleX
         *
         * Scales images along the X-axis of this proportion
         */
        this.scaleX = canvas.width / ChernoffFaces.width;

        /**
         * ### FacePainter.scaleX
         *
         * Scales images along the X-axis of this proportion
         */
        this.scaleY = canvas.height / ChernoffFaces.heigth;

        /**
         * ### FacePainter.face
         *
         * The last drawn face
         */
        this.face = null;
    }

    // ## Methods

    /**
     * ### FacePainter.draw
     *
     * Draws a face into the canvas and stores it as reference
     *
     * @param {object} face Multidimensional vector of features
     * @param {number} x Optional. The x-coordinate to center the image.
     *   Default: the center of the canvas
     * @param {number} y Optional. The y-coordinate to center the image.
     *   Default: the center of the canvas
     *
     * @see Canvas
     * @see Canvas.centerX
     * @see Canvas.centerY
     */
    FacePainter.prototype.draw = function(face, x, y) {
        if (!face) return;
        this.face = face;

        this.fit2Canvas(face);
        this.canvas.scale(face.scaleX, face.scaleY);

        //console.log('Face Scale ' + face.scaleY + ' ' + face.scaleX );

        x = x || this.canvas.centerX;
        y = y || this.canvas.centerY;

        this.drawHead(face, x, y);

        this.drawEyes(face, x, y);

        this.drawPupils(face, x, y);

        this.drawEyebrow(face, x, y);

        this.drawNose(face, x, y);

        this.drawMouth(face, x, y);
    };

    FacePainter.prototype.redraw = function(face, x, y) {
        this.canvas.clear();
        this.draw(face,x,y);
    };

    FacePainter.prototype.scale = function(x, y) {
        this.canvas.scale(this.scaleX, this.scaleY);
    };

    // TODO: Improve. It eats a bit of the margins
    FacePainter.prototype.fit2Canvas = function(face) {
        var ratio;
        if (!this.canvas) {
            console.log('No canvas found');
            return;
        }

        if (this.canvas.width > this.canvas.height) {
            ratio = this.canvas.width / face.head_radius * face.head_scale_x;
        }
        else {
            ratio = this.canvas.height / face.head_radius * face.head_scale_y;
        }

        face.scaleX = ratio / 2;
        face.scaleY = ratio / 2;
    };

    FacePainter.prototype.drawHead = function(face, x, y) {

        var radius = face.head_radius;

        this.canvas.drawOval({
            x: x,
            y: y,
            radius: radius,
            scale_x: face.head_scale_x,
            scale_y: face.head_scale_y,
            color: face.color,
            lineWidth: face.lineWidth
        });
    };

    FacePainter.prototype.drawEyes = function(face, x, y) {

        var height = FacePainter.computeFaceOffset(face, face.eye_height, y);
        var spacing = face.eye_spacing;

        var radius = face.eye_radius;
        //console.log(face);
        this.canvas.drawOval({
            x: x - spacing,
            y: height,
            radius: radius,
            scale_x: face.eye_scale_x,
            scale_y: face.eye_scale_y,
            color: face.color,
            lineWidth: face.lineWidth

        });
        //console.log(face);
        this.canvas.drawOval({
            x: x + spacing,
            y: height,
            radius: radius,
            scale_x: face.eye_scale_x,
            scale_y: face.eye_scale_y,
            color: face.color,
            lineWidth: face.lineWidth
        });
    };

    FacePainter.prototype.drawPupils = function(face, x, y) {

        var radius = face.pupil_radius;
        var spacing = face.eye_spacing;
        var height = FacePainter.computeFaceOffset(face, face.eye_height, y);

        this.canvas.drawOval({
            x: x - spacing,
            y: height,
            radius: radius,
            scale_x: face.pupil_scale_x,
            scale_y: face.pupil_scale_y,
            color: face.color,
            lineWidth: face.lineWidth
        });

        this.canvas.drawOval({
            x: x + spacing,
            y: height,
            radius: radius,
            scale_x: face.pupil_scale_x,
            scale_y: face.pupil_scale_y,
            color: face.color,
            lineWidth: face.lineWidth
        });

    };

    FacePainter.prototype.drawEyebrow = function(face, x, y) {

        var height = FacePainter.computeEyebrowOffset(face,y);
        var spacing = face.eyebrow_spacing;
        var length = face.eyebrow_length;
        var angle = face.eyebrow_angle;

        this.canvas.drawLine({
            x: x - spacing,
            y: height,
            length: length,
            angle: angle,
            color: face.color,
            lineWidth: face.lineWidth


        });

        this.canvas.drawLine({
            x: x + spacing,
            y: height,
            length: 0-length,
            angle: -angle,
            color: face.color,
            lineWidth: face.lineWidth
        });

    };

    FacePainter.prototype.drawNose = function(face, x, y) {

        var height = FacePainter.computeFaceOffset(face, face.nose_height, y);
        var nastril_r_x = x + face.nose_width / 2;
        var nastril_r_y = height + face.nose_length;
        var nastril_l_x = nastril_r_x - face.nose_width;
        var nastril_l_y = nastril_r_y;

        this.canvas.ctx.lineWidth = face.lineWidth;
        this.canvas.ctx.strokeStyle = face.color;

        this.canvas.ctx.save();
        this.canvas.ctx.beginPath();
        this.canvas.ctx.moveTo(x,height);
        this.canvas.ctx.lineTo(nastril_r_x,nastril_r_y);
        this.canvas.ctx.lineTo(nastril_l_x,nastril_l_y);
        //this.canvas.ctx.closePath();
        this.canvas.ctx.stroke();
        this.canvas.ctx.restore();

    };

    FacePainter.prototype.drawMouth = function(face, x, y) {

        var height = FacePainter.computeFaceOffset(face, face.mouth_height, y);
        var startX = x - face.mouth_width / 2;
        var endX = x + face.mouth_width / 2;

        var top_y = height - face.mouth_top_y;
        var bottom_y = height + face.mouth_bottom_y;

        // Upper Lip
        this.canvas.ctx.moveTo(startX,height);
        this.canvas.ctx.quadraticCurveTo(x, top_y, endX, height);
        this.canvas.ctx.stroke();

        //Lower Lip
        this.canvas.ctx.moveTo(startX,height);
        this.canvas.ctx.quadraticCurveTo(x, bottom_y, endX, height);
        this.canvas.ctx.stroke();

    };


    //TODO Scaling ?
    FacePainter.computeFaceOffset = function(face, offset, y) {
        y = y || 0;
        //var pos = y - face.head_radius * face.scaleY +
        //          face.head_radius * face.scaleY * 2 * offset;
        var pos = y - face.head_radius + face.head_radius * 2 * offset;
        //console.log('POS: ' + pos);
        return pos;
    };

    FacePainter.computeEyebrowOffset = function(face, y) {
        y = y || 0;
        var eyemindistance = 2;
        return FacePainter.computeFaceOffset(face, face.eye_height, y) -
            eyemindistance - face.eyebrow_eyedistance;
    };


    /*!
     *
     * A description of a Chernoff Face.
     *
     * This class packages the 11-dimensional vector of numbers from 0 through
     * 1 that completely describe a Chernoff face.
     *
     */
    FaceVector.defaults = {
        // Head
        head_radius: {
            // id can be specified otherwise is taken head_radius
            min: 10,
            max: 100,
            step: 0.01,
            value: 30,
            label: 'Face radius'
        },
        head_scale_x: {
            min: 0.2,
            max: 2,
            step: 0.01,
            value: 0.5,
            label: 'Scale head horizontally'
        },
        head_scale_y: {
            min: 0.2,
            max: 2,
            step: 0.01,
            value: 1,
            label: 'Scale head vertically'
        },
        // Eye
        eye_height: {
            min: 0.1,
            max: 0.9,
            step: 0.01,
            value: 0.4,
            label: 'Eye height'
        },
        eye_radius: {
            min: 2,
            max: 30,
            step: 0.01,
            value: 5,
            label: 'Eye radius'
        },
        eye_spacing: {
            min: 0,
            max: 50,
            step: 0.01,
            value: 10,
            label: 'Eye spacing'
        },
        eye_scale_x: {
            min: 0.2,
            max: 2,
            step: 0.01,
            value: 1,
            label: 'Scale eyes horizontally'
        },
        eye_scale_y: {
            min: 0.2,
            max: 2,
            step: 0.01,
            value: 1,
            label: 'Scale eyes vertically'
        },
        // Pupil
        pupil_radius: {
            min: 1,
            max: 9,
            step: 0.01,
            value: 1,  //this.eye_radius;
            label: 'Pupil radius'
        },
        pupil_scale_x: {
            min: 0.2,
            max: 2,
            step: 0.01,
            value: 1,
            label: 'Scale pupils horizontally'
        },
        pupil_scale_y: {
            min: 0.2,
            max: 2,
            step: 0.01,
            value: 1,
            label: 'Scale pupils vertically'
        },
        // Eyebrow
        eyebrow_length: {
            min: 1,
            max: 30,
            step: 0.01,
            value: 10,
            label: 'Eyebrow length'
        },
        eyebrow_eyedistance: {
            min: 0.3,
            max: 10,
            step: 0.01,
            value: 3, // From the top of the eye
            label: 'Eyebrow from eye'
        },
        eyebrow_angle: {
            min: -2,
            max: 2,
            step: 0.01,
            value: -0.5,
            label: 'Eyebrow angle'
        },
        eyebrow_spacing: {
            min: 0,
            max: 20,
            step: 0.01,
            value: 5,
            label: 'Eyebrow spacing'
        },
        // Nose
        nose_height: {
            min: 0.4,
            max: 1,
            step: 0.01,
            value: 0.4,
            label: 'Nose height'
        },
        nose_length: {
            min: 0.2,
            max: 30,
            step: 0.01,
            value: 15,
            label: 'Nose length'
        },
        nose_width: {
            min: 0,
            max: 30,
            step: 0.01,
            value: 10,
            label: 'Nose width'
        },
        // Mouth
        mouth_height: {
            min: 0.2,
            max: 2,
            step: 0.01,
            value: 0.75,
            label: 'Mouth height'
        },
        mouth_width: {
            min: 2,
            max: 100,
            step: 0.01,
            value: 20,
            label: 'Mouth width'
        },
        mouth_top_y: {
            min: -10,
            max: 30,
            step: 0.01,
            value: -2,
            label: 'Upper lip'
        },
        mouth_bottom_y: {
            min: -10,
            max: 30,
            step: 0.01,
            value: 20,
            label: 'Lower lip'
        },

        scaleX: {
            min: 0,
            max: 20,
            step: 0.01,
            value: 0.2,
            label: 'Scale X'
        },

        scaleY: {
            min: 0,
            max: 20,
            step: 0.01,
            value: 0.2,
            label: 'Scale Y'
        },

        color: {
            min: 0,
            max: 20,
            step: 0.01,
            value: 0.2,
            label: 'color'
        },

        lineWidth: {
            min: 0,
            max: 20,
            step: 0.01,
            value: 0.2,
            label: 'lineWidth'
        }


    };

    // Constructs a random face vector.
    FaceVector.random = function() {
        var out = {};
        for (var key in FaceVector.defaults) {
            if (FaceVector.defaults.hasOwnProperty(key)) {
                if (key === 'color') {
                    out.color = 'red';
                }
                else if (key === 'lineWidth') {
                    out.lineWidth = 1;
                }
                else if (key === 'scaleX') {
                    out.scaleX = 1;
                }
                else if (key === 'scaleY') {
                    out.scaleY = 1;
                }
                else {
                    out[key] = FaceVector.defaults[key].min +
                        Math.random() * FaceVector.defaults[key].max;
                }
            }
        }
        return new FaceVector(out);
    };

    function FaceVector(faceVector) {
        faceVector = faceVector || {};

        this.scaleX = faceVector.scaleX || 1;
        this.scaleY = faceVector.scaleY || 1;


        this.color = faceVector.color || 'green';
        this.lineWidth = faceVector.lineWidth || 1;

        // Merge on key
        for (var key in FaceVector.defaults) {
            if (FaceVector.defaults.hasOwnProperty(key)){
                if (faceVector.hasOwnProperty(key)){
                    this[key] = faceVector[key];
                }
                else {
                    this[key] = FaceVector.defaults[key].value;
                }
            }
        }

    }

    //Constructs a random face vector.
    FaceVector.prototype.shuffle = function() {
        for (var key in this) {
            if (this.hasOwnProperty(key)) {
                if (FaceVector.defaults.hasOwnProperty(key)) {
                    if (key !== 'color') {
                        this[key] = FaceVector.defaults[key].min +
                            Math.random() * FaceVector.defaults[key].max;
                    }
                }
            }
        }
    };

    //Computes the Euclidean distance between two FaceVectors.
    FaceVector.prototype.distance = function(face) {
        return FaceVector.distance(this, face);
    };


    FaceVector.distance = function(face1, face2) {
        var sum = 0.0;
        var diff;

        for (var key in face1) {
            if (face1.hasOwnProperty(key)) {
                diff = face1[key] - face2[key];
                sum = sum + diff * diff;
            }
        }

        return Math.sqrt(sum);
    };

    FaceVector.prototype.toString = function() {
        var out = 'Face: ';
        for (var key in this) {
            if (this.hasOwnProperty(key)) {
                out += key + ' ' + this[key];
            }
        }
        return out;
    };

})(node);
