Shader "Universal Render Pipeline/ScreenSpaceAmbientOcclusion2"
{
    HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl"
        #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/EntityLighting.hlsl"
        #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/ImageBasedLighting.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

        struct Attributes
        {
            float4 positionHCS   : POSITION;
            float2 uv           : TEXCOORD0;
            UNITY_VERTEX_INPUT_INSTANCE_ID
        };

        struct Varyings
        {
            float4  positionCS  : SV_POSITION;
            float2  uv          : TEXCOORD0;
            UNITY_VERTEX_OUTPUT_STEREO
        };

        Varyings VertDefault(Attributes input)
        {
            Varyings output;
            UNITY_SETUP_INSTANCE_ID(input);
            UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(output);

            // Note: The pass is setup with a mesh already in CS
            // Therefore, we can just output vertex position
            output.positionCS = float4(input.positionHCS.xyz, 1.0);

            #if UNITY_UV_STARTS_AT_TOP
            output.positionCS.y *= _ScaleBiasRt.x;
            #endif

            output.uv = input.uv;

            // Add a small epsilon to avoid artifacts when reconstructing the normals
            output.uv += 1.0e-6;

            return output;
        }

    ENDHLSL

    SubShader
    {
        Tags{ "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline"}
        Cull Off ZWrite Off ZTest Always

        // ------------------------------------------------------------------
        // Depth only passes
        // ------------------------------------------------------------------

        // 0 - Occlusion estimation with CameraDepthTexture
        Pass
        {
            Name "SSAO_Occlusion"
            ZTest Always
            ZWrite Off
            Cull Off

            HLSLPROGRAM
                #pragma vertex VertDefault
                #pragma fragment SSAO
                #pragma multi_compile_fragment _ _GBUFFER_NORMALS_OCT
                #pragma multi_compile_local _SOURCE_DEPTH _SOURCE_DEPTH_NORMALS
                #pragma multi_compile_local _RECONSTRUCT_NORMAL_LOW _RECONSTRUCT_NORMAL_MEDIUM _RECONSTRUCT_NORMAL_HIGH
                #pragma multi_compile_local _ _ORTHOGRAPHIC
                #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/SSAO.hlsl"
            ENDHLSL
        }

        // 1 - Horizontal Blur
        Pass
        {
            Name "SSAO_HorizontalBlur"

            HLSLPROGRAM
                #pragma vertex VertDefault
                #pragma fragment HorizontalBlur
                #define BLUR_SAMPLE_CENTER_NORMAL
                #pragma multi_compile_local _ _ORTHOGRAPHIC
                #pragma multi_compile_fragment _ _GBUFFER_NORMALS_OCT
                #pragma multi_compile_local _SOURCE_DEPTH _SOURCE_DEPTH_NORMALS
                #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/SSAO.hlsl"
            ENDHLSL
        }

        // 2 - Vertical Blur
        Pass
        {
            Name "SSAO_VerticalBlur"

            HLSLPROGRAM
                #pragma vertex VertDefault
                #pragma fragment VerticalBlur
                #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/SSAO.hlsl"
            ENDHLSL
        }

        // 3 - Final Blur
        Pass
        {
            Name "SSAO_FinalBlur"

            HLSLPROGRAM
                #pragma vertex VertDefault
                #pragma fragment FinalBlur
                #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/SSAO.hlsl"
            ENDHLSL
        }

        // 4 - After Opaque
        Pass
        {
            Name "SSAO_AfterOpaque"

            ZTest NotEqual
            ZWrite Off
            Cull Off
            Blend DstColor Zero


            

            HLSLPROGRAM
                #pragma vertex VertDefault
                #pragma fragment FragAfterOpaque
                #define _SCREEN_SPACE_OCCLUSION

                #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
                sampler2D _CameraOpaqueTexture;

                half4 OverlayBlendMode(half4 basePixel, half4 blendPixel)
                {
                    if(length(basePixel) < 0.5)
                    {
                        return (2.0 * basePixel * blendPixel);
                    }
                    return (1.0 - 2.0 * (1.0 - basePixel) * (1.0 - blendPixel));
                }

                half4 FragAfterOpaque(Varyings input) : SV_Target
                {
                    UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(input);
                    half4 diffuse = tex2D(_CameraOpaqueTexture, input.uv);

                    AmbientOcclusionFactor aoFactor = GetScreenSpaceAmbientOcclusion(input.uv);
                    half occlusion = aoFactor.indirectAmbientOcclusion;

                    return OverlayBlendMode(diffuse,half4(occlusion,occlusion,occlusion,1));//lerp(diffuse,half4(1,1,1,1) , occlusion);// half4(0.1, 0.0, 0.0, 1.0)* (1-occlusion);
                }

            ENDHLSL
        }
    }
}
