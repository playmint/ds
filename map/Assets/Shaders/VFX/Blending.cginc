half3 add(half3 a, half3 b)
{
    return min(a + b, 1.0);
}

half3 average(half3 a, half3 b)
{
    return (a + b) / 2.0;
}

half3 colorBurn(half3 a, half3 b)
{
    return b == 0.0 ? b : max((1.0 - ((1.0 - a) / b)), 0.0);
}

half3 colorDodge(half3 a, half3 b)
{
    return b == 1.0 ? b : min(a / (1.0 - b), 1.0);
}

half3 darken(half3 a, half3 b)
{
    return min(a, b);
}

half3 difference(half3 a, half3 b)
{
    return abs(a - b);
}

half3 exclusion(half3 a, half3 b)
{
    return a + b - 2.0 * a * b;
}

half3 glow(half3 a, half3 b)
{
    return (a == 1.0) ? a : min(b * b / (1.0 - a), 1.0);
}

half3 hardLight(half3 a, half3 b)
{
    return b < 0.5 ? (2.0 * a * b) : (1.0 - 2.0 * (1.0 - a) * (1.0 - b));
}

half3 lighten(half3 a, half3 b)
{
    return max(a, b);
}

half3 linearBurn(half3 a, half3 b)
{
    return max(a + b - 1.0, 0.0);
}

half3 linearDodge(half3 a, half3 b)
{
    return min(a + b, 1.0);
}

half3 linearLight(half3 a, half3 b)
{
    return b < 0.5 ? linearBurn(a, (2.0 * b)) : linearDodge(a, (2.0 * (b - 0.5)));
}

half3 multiply(half3 a, half3 b)
{
    return a * b;
}

half3 negation(half3 a, half3 b)
{
    return 1.0 - abs(1.0 - a - b);
}

half3 normal(half3 a, half3 b)
{
    return b;
}

half3 overlay(half3 a, half3 b)
{
    return a < 0.5 ? (2.0 * a * b) : (1.0 - 2.0 * (1.0 - a) * (1.0 - b));
}

half3 phoenix(half3 a, half3 b)
{
    return min(a, b) - max(a, b) + 1.0;
}

half3 pinLight(half3 a, half3 b)
{
    return (b < 0.5) ? darken(a, (2.0 * b)) : lighten(a, (2.0 * (b - 0.5)));
}

half3 reflect(half3 a, half3 b)
{
    return (b == 1.0) ? b : min(a * a / (1.0 - b), 1.0);
}

half3 screen(half3 a, half3 b)
{
    return 1.0 - (1.0 - a) * (1.0 - b);
}

half3 softLight(half3 a, half3 b)
{
    return (b < 0.5) ? (2.0 * a * b + a * a * (1.0 - 2.0 * b)) : (sqrt(a) * (2.0 * b - 1.0) + (2.0 * a) * (1.0 - b));
}

half3 subtract(half3 a, half3 b)
{
    return max(a + b - 1.0, 0.0);
}

half3 vividLight(half3 a, half3 b)
{
    return (b < 0.5) ? colorBurn(a, (2.0 * b)) : colorDodge(a, (2.0 * (b - 0.5)));
}

half3 hardMix(half3 a, half3 b)
{
    return vividLight(a, b) < 0.5 ? 0.0 : 1.0;
}
