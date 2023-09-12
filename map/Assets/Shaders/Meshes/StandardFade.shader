Shader "Custom/StandardFade"
{
    Properties
    {
        _Color ("Color", Color) = (1,1,1,1)
        _MainTex ("Albedo (RGB)", 2D) = "white" {}
        _Glossiness ("Smoothness", Range(0,1)) = 0.5
        _Metallic ("Metallic", Range(0,1)) = 0.0
        [GDR]_EmissionColor("Emission", Color) = (0,0,0,1)
        _DitherTexture ("Dither Texture", 2D) = "white" {}
        _Fade("Fade", Range(0,1)) = 1.0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200

        CGPROGRAM
        // Physically based Standard lighting model, and enable shadows on all light types
        #pragma surface surf Standard fullforwardshadows addshadow

        // Use shader model 3.0 target, to get nicer looking lighting
        #pragma target 3.0

        sampler2D _MainTex;
        sampler2D _DitherTexture;
        float4 _DitherTexture_TexelSize;

        struct Input
        {
            float2 uv_MainTex;
            float4 screenPos;
        };

        half _Glossiness;
        half _Metallic;
        fixed4 _Color;
        float4 _EmissionColor;
        half _Fade;

        // Add instancing support for this shader. You need to check 'Enable Instancing' on materials that use the shader.
        // See https://docs.unity3d.com/Manual/GPUInstancing.html for more information about instancing.
        // #pragma instancing_options assumeuniformscaling
        UNITY_INSTANCING_BUFFER_START(Props)
            // put more per-instance properties here
        UNITY_INSTANCING_BUFFER_END(Props)

        void surf (Input IN, inout SurfaceOutputStandard o)
        {
            float2 coords = IN.screenPos.xy / IN.screenPos.w;
            float2 ditherCoordinate = coords * _ScreenParams.xy * _DitherTexture_TexelSize.xy;
            float ditherValue = tex2D(_DitherTexture, ditherCoordinate).r;
            // Albedo comes from a texture tinted by color
            fixed4 c = tex2D (_MainTex, IN.uv_MainTex) * _Color;
            o.Albedo = c.rgb;
o.Emission = _EmissionColor;
            // Metallic and smoothness come from slider variables
            o.Metallic = _Metallic;
            o.Smoothness = _Glossiness;
            o.Alpha = c.a * step(ditherValue,_Fade)-0.1;
            clip(step(ditherValue,_Fade)-0.1);



/*
float2 coords = IN.screenPos.xy / IN.screenPos.w;
            float2 ditherCoordinate = coords * _ScreenParams.xy * _DitherTex_TexelSize.xy;
            float ditherValue = tex2D(_DitherTex, ditherCoordinate).r;
            // Albedo comes from a texture tinted by color
            fixed4 c = tex2D (_MainTex, IN.uv_MainTex) * _Color;
            o.Albedo = c.rgb;//_EmissionColor;;
            // Metallic and smoothness come from slider variables
            o.Metallic = _Metallic;
            o.Smoothness = _Glossiness;
            o.Alpha = c.a * step(ditherValue, _Fade)-0.1;
            o.Emission = _EmissionColor.rgb;

            clip(step(ditherValue, _Fade)-0.1);*/
        }
        ENDCG
    }
    FallBack "Diffuse"
}
