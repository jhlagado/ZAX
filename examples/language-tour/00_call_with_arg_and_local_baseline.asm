; ZAX lowered .asm trace
; range: $0100..$0168 (end exclusive)

; func inc_one begin
inc_one:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
ld HL, $0022                   ; 0108: 21 22 00
push HL                        ; 010B: E5
ld HL, $0033                   ; 010C: 21 33 00
push HL                        ; 010F: E5
push AF                        ; 0110: F5
push BC                        ; 0111: C5
push DE                        ; 0112: D5
ld E, (IX + $0004)             ; 0113: DD 5E 04
ld D, (IX + $0005)             ; 0116: DD 56 05
inc DE                         ; 0119: 13
ld (IX - $0002), E             ; 011A: DD 73 FE
ld (IX - $0001), D             ; 011D: DD 72 FF
ld E, (IX - $0002)             ; 0120: DD 5E FE
ld D, (IX - $0001)             ; 0123: DD 56 FF
ex DE, HL                      ; 0126: EB
__zax_epilogue_0:
pop DE                         ; 0127: D1
pop BC                         ; 0128: C1
pop AF                         ; 0129: F1
ld SP, IX                      ; 012A: DD F9
pop IX                         ; 012C: DD E1
ret                            ; 012E: C9
; func inc_one end
; func main begin
main:
push IX                        ; 012F: DD E5
ld IX, $0000                   ; 0131: DD 21 00 00
add IX, SP                     ; 0135: DD 39
push HL                        ; 0137: E5
ld HL, $0011                   ; 0138: 21 11 00
ex (SP), HL                    ; 013B: E3
push AF                        ; 013C: F5
push BC                        ; 013D: C5
push DE                        ; 013E: D5
push HL                        ; 013F: E5
ld HL, $0044                   ; 0140: 21 44 00
push HL                        ; 0143: E5
call inc_one                   ; 0144: CD 00 00
inc SP                         ; 0147: 33
inc SP                         ; 0148: 33
push DE                        ; 0149: D5
ex DE, HL                      ; 014A: EB
push AF                        ; 014B: F5
push BC                        ; 014C: C5
push DE                        ; 014D: D5
push IX                        ; 014E: DD E5
pop HL                         ; 0150: E1
ld DE, $FFFE                   ; 0151: 11 FE FF
add HL, DE                     ; 0154: 19
push HL                        ; 0155: E5
pop HL                         ; 0156: E1
pop DE                         ; 0157: D1
pop BC                         ; 0158: C1
pop AF                         ; 0159: F1
ld (hl), E                     ; 015A: 73
inc HL                         ; 015B: 23
ld (hl), D                     ; 015C: 72
ex DE, HL                      ; 015D: EB
pop DE                         ; 015E: D1
__zax_epilogue_1:
pop HL                         ; 015F: E1
pop DE                         ; 0160: D1
pop BC                         ; 0161: C1
pop AF                         ; 0162: F1
ld SP, IX                      ; 0163: DD F9
pop IX                         ; 0165: DD E1
ret                            ; 0167: C9
; func main end

; symbols:
; label inc_one = $0100
; label __zax_epilogue_0 = $0127
; label main = $012F
; label __zax_epilogue_1 = $015F
