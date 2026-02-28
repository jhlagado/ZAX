; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_glob_reg begin
byte_glob_reg:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld e, (ix+$04)                 ; 010B: DD 5E 04
ld d, (ix+$05)                 ; 010E: DD 56 05
ex de, hl                      ; 0111: EB
push HL                        ; 0112: E5
pop HL                         ; 0113: E1
push HL                        ; 0114: E5
ld HL, glob_bytes              ; 0115: 21 00 00
pop DE                         ; 0118: D1
add HL, DE                     ; 0119: 19
push HL                        ; 011A: E5
pop HL                         ; 011B: E1
ld B, (hl)                     ; 011C: 46
ld e, (ix+$04)                 ; 011D: DD 5E 04
ld d, (ix+$05)                 ; 0120: DD 56 05
ex de, hl                      ; 0123: EB
push HL                        ; 0124: E5
pop HL                         ; 0125: E1
push HL                        ; 0126: E5
ld HL, glob_bytes              ; 0127: 21 00 00
pop DE                         ; 012A: D1
add HL, DE                     ; 012B: 19
push HL                        ; 012C: E5
pop HL                         ; 012D: E1
ld (hl), B                     ; 012E: 70
ld H, $0000                    ; 012F: 26 00
ld L, B                        ; 0131: 68
__zax_epilogue_0:
pop DE                         ; 0132: D1
pop BC                         ; 0133: C1
pop AF                         ; 0134: F1
ld SP, IX                      ; 0135: DD F9
pop IX                         ; 0137: DD E1
ret                            ; 0139: C9
; func byte_glob_reg end
; func main begin
main:
push IX                        ; 013A: DD E5
ld IX, $0000                   ; 013C: DD 21 00 00
add IX, SP                     ; 0140: DD 39
push AF                        ; 0142: F5
push BC                        ; 0143: C5
push DE                        ; 0144: D5
push HL                        ; 0145: E5
ld HL, $0003                   ; 0146: 21 03 00
push HL                        ; 0149: E5
call byte_glob_reg             ; 014A: CD 00 00
inc SP                         ; 014D: 33
inc SP                         ; 014E: 33
__zax_epilogue_1:
pop HL                         ; 014F: E1
pop DE                         ; 0150: D1
pop BC                         ; 0151: C1
pop AF                         ; 0152: F1
ld SP, IX                      ; 0153: DD F9
pop IX                         ; 0155: DD E1
ret                            ; 0157: C9
; func main end

; symbols:
; label byte_glob_reg = $0100
; label __zax_epilogue_0 = $0132
; label main = $013A
; label __zax_epilogue_1 = $014F
; data glob_bytes = $2000
