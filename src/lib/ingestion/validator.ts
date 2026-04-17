import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: true });

const kpIndexSchema = {
    type: "object",
    required: ["value"],
    properties: {
        value: { type: "integer", minimum: 0, maximum: 9 }
    }
};

const seismicCountSchema = {
    type: "object",
    required: ["value"],
    properties: {
        value: { type: "integer", minimum: 0 }
    }
};

const solarFluxSchema = {
    type: "object",
    required: ["value"],
    properties: {
        value: { type: "number", minimum: 0 }
    }
};

// Compile schemas
const validateKp = ajv.compile(kpIndexSchema);
const validateSeismic = ajv.compile(seismicCountSchema);
const validateSolar = ajv.compile(solarFluxSchema);

export function validateSample(source: string, payload: any): { valid: boolean, errors?: any } {
    let valid = false;
    let errors = null;

    switch (source) {
        case 'kp_index':
            valid = validateKp(payload);
            errors = validateKp.errors;
            break;
        case 'seismic_count':
            valid = validateSeismic(payload);
            errors = validateSeismic.errors;
            break;
        case 'solar_flux':
            valid = validateSolar(payload);
            errors = validateSolar.errors;
            break;
        default:
            return { valid: false, errors: `Unknown source schema: ${source}` };
    }

    return { valid, errors };
}
