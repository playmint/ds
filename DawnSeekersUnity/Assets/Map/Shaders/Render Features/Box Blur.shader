// Two-pass box blur shader created for URP 12 and Unity 2021.2
// Made by Alexander Ameye 
// https://alexanderameye.github.io/

Shader "Hidden/Box Blur"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white"
    }

    SubShader
    {
        Tags
        {
            "RenderType"="Opaque" "RenderPipeline" = "UniversalPipeline"
        }

        HLSLINCLUDE
        #pragma vertex vert
        #pragma fragment frag

        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

        struct Attributes
        {
            float4 positionOS : POSITION;
            float2 uv : TEXCOORD0;
        };

        struct Varyings
        {
            float4 positionHCS : SV_POSITION;
            float2 uv : TEXCOORD0;
        };

        TEXTURE2D(_MainTex);

        SAMPLER(sampler_MainTex);
        float4 _MainTex_TexelSize;
        float4 _MainTex_ST;

        int _rBlurStrength;
        int _gBlurStrength;
        int _bBlurStrength;
        int _aBlurStrength;

        Varyings vert(Attributes IN)
        {
            Varyings OUT;
            OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
            OUT.uv = TRANSFORM_TEX(IN.uv, _MainTex);
            return OUT;
        }
        ENDHLSL

        Pass
        {
            Name "VERTICAL BOX BLUR"

            HLSLPROGRAM
            half4 frag(Varyings IN) : SV_TARGET
            {
                float2 res = _MainTex_TexelSize.xy;
                half4 sum = 0;
                int samples = 2 * _rBlurStrength + 1;

                for (float y = 0; y < samples; y++)
                {
                    float2 offset = float2(0, y - _rBlurStrength);
                    sum.r += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv + offset * res).r;
                }
                sum.r = sum.r / samples;

                samples = 2 * _gBlurStrength + 1;

                for (float y = 0; y < samples; y++)
                {
                    float2 offset = float2(0, y - _gBlurStrength);
                    sum.g += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv + offset * res).g;
                }
                sum.g = sum.g / samples;

                samples = 2 * _bBlurStrength + 1;

                for (float y = 0; y < samples; y++)
                {
                    float2 offset = float2(0, y - _bBlurStrength);
                    sum.b += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv + offset * res).b;
                }
                sum.b = sum.b / samples;

                samples = 2 * _aBlurStrength + 1;

                for (float y = 0; y < samples; y++)
                {
                    float2 offset = float2(0,y - _aBlurStrength);
                    sum.a += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv + offset * res).a;
                }
                sum.a = sum.a / samples;

                //sum.r = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv).r;
                return sum;
            }
            ENDHLSL
        }

        Pass
        {
            Name "HORIZONTAL BOX BLUR"

            HLSLPROGRAM
            half4 frag(Varyings IN) : SV_TARGET
            {
                float2 res = _MainTex_TexelSize.xy;
                half4 sum = 0;
                int samples = 2 * _rBlurStrength + 1;

                for (float y = 0; y < samples; y++)
                {
                    float2 offset = float2(y - _rBlurStrength,0);
                    sum.r += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv + offset * res).r;
                }
                sum.r = sum.r / samples;

                samples = 2 * _gBlurStrength + 1;

                for (float y = 0; y < samples; y++)
                {
                    float2 offset = float2(y - _gBlurStrength,0);
                    sum.g += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv + offset * res).g;
                }
                sum.g = sum.g / samples;

                samples = 2 * _bBlurStrength + 1;

                for (float y = 0; y < samples; y++)
                {
                    float2 offset = float2(y - _bBlurStrength,0);
                    sum.b += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv + offset * res).b;
                }
                sum.b = sum.b / samples;

                samples = 2 * _aBlurStrength + 1;

                for (float y = 0; y < samples; y++)
                {
                    float2 offset = float2(y - _aBlurStrength,0);
                    sum.a += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv + offset * res).a;
                }
                sum.a = sum.a / samples;
                return sum;
            }
            ENDHLSL
        }
    }
}