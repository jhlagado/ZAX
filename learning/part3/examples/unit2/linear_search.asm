; ZAX lowered .asm trace
; range: $0100..$8061 (end exclusive)

; func linear_search begin
linear_search:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
ld HL, $0000                   ; 0108: 21 00 00
push HL                        ; 010B: E5
ld HL, $0000                   ; 010C: 21 00 00
push HL                        ; 010F: E5
push AF                        ; 0110: F5
push BC                        ; 0111: C5
push DE                        ; 0112: D5
ld A, $0001                    ; 0113: 3E 01
or A                           ; 0115: B7
__zax_while_cond_1:
jp z, __zax_while_end_2        ; 0116: CA 00 00
ld A, (ix-$02)                 ; 0119: DD 7E FE
cp ItemCount                   ; 011C: FE 08
jp c, __zax_if_else_3          ; 011E: DA 00 00
ld HL, $FFFF                   ; 0121: 21 FF FF
jp __zax_epilogue_0            ; 0124: C3 00 00
__zax_if_else_3:
ex DE, HL                      ; 0127: EB
ld E, (IX - $0002)             ; 0128: DD 5E FE
ex DE, HL                      ; 012B: EB
push DE                        ; 012C: D5
push HL                        ; 012D: E5
ld de, values                  ; 012E: 11 00 00
ld H, $0000                    ; 0131: 26 00
ld L, L                        ; 0133: 6D
add HL, DE                     ; 0134: 19
ld A, (HL)                     ; 0135: 7E
pop HL                         ; 0136: E1
pop DE                         ; 0137: D1
ld (ix-$04), A                 ; 0138: DD 77 FC
ld A, (ix+$04)                 ; 013B: DD 7E 04
ld B, (ix-$04)                 ; 013E: DD 46 FC
cp B                           ; 0141: B8
jp nz, __zax_if_else_5         ; 0142: C2 00 00
ld H, $0000                    ; 0145: 26 00
ld A, (ix-$02)                 ; 0147: DD 7E FE
ld L, A                        ; 014A: 6F
jp __zax_epilogue_0            ; 014B: C3 00 00
__zax_if_else_5:
push DE                        ; 014E: D5
ld E, (IX - $0002)             ; 014F: DD 5E FE
inc E                          ; 0152: 1C
ld (IX - $0002), E             ; 0153: DD 73 FE
pop DE                         ; 0156: D1
ld A, $0001                    ; 0157: 3E 01
or A                           ; 0159: B7
jp __zax_while_cond_1          ; 015A: C3 00 00
__zax_while_end_2:
ld HL, $FFFF                   ; 015D: 21 FF FF
__zax_epilogue_0:
pop DE                         ; 0160: D1
pop BC                         ; 0161: C1
pop AF                         ; 0162: F1
ld SP, IX                      ; 0163: DD F9
pop IX                         ; 0165: DD E1
ret                            ; 0167: C9
; func linear_search end
; func main begin
main:
push IX                        ; 0168: DD E5
ld IX, $0000                   ; 016A: DD 21 00 00
add IX, SP                     ; 016E: DD 39
push AF                        ; 0170: F5
push BC                        ; 0171: C5
push DE                        ; 0172: D5
push HL                        ; 0173: E5
ld HL, $0008                   ; 0174: 21 08 00
push HL                        ; 0177: E5
call linear_search             ; 0178: CD 00 00
inc SP                         ; 017B: 33
inc SP                         ; 017C: 33
__zax_epilogue_7:
pop HL                         ; 017D: E1
pop DE                         ; 017E: D1
pop BC                         ; 017F: C1
pop AF                         ; 0180: F1
ld SP, IX                      ; 0181: DD F9
pop IX                         ; 0183: DD E1
ret                            ; 0185: C9
; func main end

; symbols:
; label linear_search = $0100
; label __zax_while_cond_1 = $0116
; label __zax_if_else_3 = $0127
; label __zax_if_else_5 = $014E
; label __zax_while_end_2 = $015D
; label __zax_epilogue_0 = $0160
; label main = $0168
; label __zax_epilogue_7 = $017D
; data values = $8000
; label __zax_startup = $8008
; constant ItemCount = $0008 (8)
