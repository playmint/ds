Shader "Unlit/BillboardSprite" {
Properties {
        _Color ("Tint", Color) = (0, 0, 0, 1)
        _MainTex ("Sprite Texture", 2D) = "white" {}
    }

    SubShader {
        Tags{ 
			"RenderType"="Transparent" 
			"Queue"="Transparent"
"DisableBatching" = "True"
		}

		Blend SrcAlpha OneMinusSrcAlpha

		ZWrite off
		Cull off
        LOD 200

        Pass {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            fixed4 _Color;

			struct appdata{
				float4 vertex : POSITION;
				float2 uv : TEXCOORD0;
				fixed4 color : COLOR;
			};

            struct v2f
			{
				float2 uv : TEXCOORD0;
				UNITY_FOG_COORDS(1)
				float4 pos : SV_POSITION;
				fixed4 color : COLOR;
			};

            sampler2D _MainTex;
            float4 _MainTex_ST;

            v2f vert (appdata v)
			{
				v2f o;
				o.pos = UnityObjectToClipPos(v.vertex);
				o.uv = v.uv.xy;

				// billboard mesh towards camera
				float3 vpos = mul((float3x3)unity_ObjectToWorld, v.vertex.xyz);
				float4 worldCoord = float4(unity_ObjectToWorld._m03, unity_ObjectToWorld._m13, unity_ObjectToWorld._m23, 1);
				float4 viewPos = mul(UNITY_MATRIX_V, worldCoord) + float4(vpos, 0);
				float4 outPos = mul(UNITY_MATRIX_P, viewPos);
			
				o.pos = outPos;
					o.color = v.color;
				UNITY_TRANSFER_FOG(o,o.vertex);
				return o;
			}

            fixed4 frag (v2f i) : SV_Target {
                fixed4 col = tex2D(_MainTex, i.uv);
				col *= _Color;
				col *= i.color;
				return col;
            }
            ENDCG
        }
    }
    FallBack "Diffuse"
}